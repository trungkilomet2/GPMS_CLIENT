import ProductionService from "@/services/ProductionService";
import ProductionPartService from "@/services/ProductionPartService";
import WorkerService from "@/services/WorkerService";

/**
 * Robust date parser
 */
const parseSafeDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Helper to check if a production period overlaps with a given month/year
 */
const overlapsMonth = (startStr, endStr, month, year) => {
  const targetStart = new Date(year, month - 1, 1);
  const targetEnd = new Date(year, month, 0, 23, 59, 59);
  const start = parseSafeDate(startStr);
  const end = parseSafeDate(endStr);

  if (!start) return true;
  if (start > targetEnd) return false;
  if (end && end < targetStart) return false;
  return true;
};

/**
 * Aggregated Payroll Fetcher
 */
export const fetchAggregatedPayroll = async (month, year) => {
  const targetMonth = Number(month);
  const targetYear = Number(year);

  try {
    let allProductions = [];
    let prodIdx = 0;
    let hasMoreProds = true;

    while (hasMoreProds && prodIdx < 15) {
      const res = await ProductionService.getProductionList({ PageIndex: prodIdx, PageSize: 30 });
      const data = res?.data?.data || res?.data || [];
      if (Array.isArray(data) && data.length > 0) {
        allProductions = [...allProductions, ...data];
        hasMoreProds = data.length === 30;
        prodIdx++;
      } else {
        hasMoreProds = false;
      }
    }

    if (allProductions.length === 0) return [];

    const productionMap = new Map();
    allProductions.forEach(p => {
      const id = String(p.productionId || p.id);
      productionMap.set(id, p);
    });

    const relevantProds = allProductions.filter(p =>
      overlapsMonth(p.startDate || p.pStartDate, p.endDate || p.pEndDate, targetMonth, targetYear)
    );

    const [workerDicRes, managerDicRes] = await Promise.all([
      WorkerService.getEmployeeDirectory({ includeHidden: true }),
      WorkerService.getManagerDirectory({ includeHidden: true }),
    ]);

    const workerDirectory = [
      ...(workerDicRes?.data || []),
      ...(managerDicRes?.data || [])
    ];
    const workerProfileMap = new Map();
    workerDirectory.forEach(w => { if (w.id) workerProfileMap.set(String(w.id), w); });

    const allLogsList = [];
    const partMap = new Map();
    const CHUNK_SIZE = 5;

    for (let i = 0; i < relevantProds.length; i += CHUNK_SIZE) {
      const chunk = relevantProds.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (prod) => {
          const pid = String(prod.productionId || prod.id);
          try {
            const [logsRes, partsRes] = await Promise.all([
              ProductionPartService.getProductionWorkLogs(pid, { PageIndex: 0, PageSize: 100 }),
              ProductionPartService.getPartsByProduction(pid, { PageIndex: 0, PageSize: 100 })
            ]);
            return { pid, logs: logsRes?.data?.data || logsRes?.data || [], parts: partsRes?.data?.data || partsRes?.data || [] };
          } catch (e) { return { pid, logs: [], parts: [] }; }
        })
      );

      chunkResults.forEach(({ pid, logs, parts }) => {
        const prod = productionMap.get(pid);
        const name = prod?.orderName || prod?.pOrderName || prod?.productName || prod?.order?.orderName || "-";
        parts.forEach(p => {
          partMap.set(`${pid}_${p.id || p.partId}`, { ...p, orderName: name });
        });
        allLogsList.push(...logs.map(l => ({ ...l, productionId: pid })));
      });
    }

    const workerMap = new Map();
    allLogsList.forEach(log => {
      const d = parseSafeDate(log.createDate || log.workDate || log.reportDate);
      if (!d || d.getMonth() + 1 !== targetMonth || d.getFullYear() !== targetYear) return;

      const uid = log.userId || log.uId || log.accountId || log.workerId;
      if (!uid) return;

      const key = String(uid);
      if (!workerMap.has(key)) {
        workerMap.set(key, {
          userId: Number(uid),
          workerName: log.workerName || log.userName || log.fullName || `Thợ #${uid}`,
          totalQuantity: 0,
          totalSalary: 0,
          logCount: 0,
          uniqueProductions: new Set(),
          logs: [],
        });
      }

      const stats = workerMap.get(key);
      const pid = String(log.productionId || log.prodId);
      if (pid && pid !== "undefined") stats.uniqueProductions.add(pid);

      const partId = log.productionPartId || log.partId;
      const partInfo = partMap.get(`${pid}_${partId}`);
      const prodInfo = productionMap.get(pid);

      const qty = Number(log.quantity || 0);
      const cpu = Number(log.cpu || partInfo?.cpu || 0);

      stats.totalQuantity += qty;
      if (log.isReadOnly || log.status === 2 || log.statusName === "Đã nghiệm thu") {
        stats.totalSalary += qty * cpu;
      }
      stats.logCount += 1;

      stats.logs.push({
        ...log,
        id: log.id || log.workLogId,
        partName: log.partName || log.productionPartName || partInfo?.partName || "-",
        cpu,
        orderName: log.orderName || partInfo?.orderName || prodInfo?.orderName || prodInfo?.pOrderName || prodInfo?.productName || prodInfo?.order?.orderName || "-",
        reportDate: log.createDate || log.workDate || log.reportDate,
        productionId: pid,
      });
    });

    workerMap.forEach((stats, key) => {
      const profile = workerProfileMap.get(key);
      if (profile) {
        if (profile.fullName && profile.fullName !== "Chưa cập nhật") stats.fullName = profile.fullName;
        if (profile.avatarUrl) stats.avatarUrl = profile.avatarUrl;
      }
      stats.productionCount = stats.uniqueProductions.size;
    });

    return Array.from(workerMap.values()).sort((a, b) => b.totalSalary - a.totalSalary);
  } catch (err) {
    console.error("Aggregation failed", err);
    throw err;
  }
};

/**
 * Optimized worker detail fetch with production name enrichment
 */
export const fetchWorkerPayroll = async (workerId, month, year) => {
  const targetMonth = Number(month);
  const targetYear = Number(year);

  try {
    const response = await ProductionService.getWorkerOutputHistory(workerId);
    let logs = response?.data?.data || response?.data || [];
    if (!Array.isArray(logs)) {
      return { userId: workerId, workerName: `Thợ #${workerId}`, totalQuantity: 0, totalSalary: 0, logs: [] };
    }

    logs = logs.filter(log => {
      const d = parseSafeDate(log.createDate || log.workDate || log.reportDate);
      return d && (d.getMonth() + 1 === targetMonth) && (d.getFullYear() === targetYear);
    });

    if (logs.length === 0) {
      // FALLBACK: If specialized fetch yields nothing, use the aggregated logic (same as the list view)
      const allData = await fetchAggregatedPayroll(targetMonth, targetYear);
      const found = allData.find(w => String(w.userId) === String(workerId));
      if (found) return found;
      return { userId: workerId, workerName: `Thợ #${workerId}`, totalQuantity: 0, totalSalary: 0, logs: [] };
    }

    const listRes = await ProductionService.getProductionList({ PageSize: 100 });
    const listData = listRes?.data?.data || listRes?.data || [];
    const listMap = new Map();
    listData.forEach(p => listMap.set(String(p.productionId || p.id), p));

    const uniqueProdIds = Array.from(new Set(logs.map(l => String(l.productionId || l.prodId)).filter(Boolean)));
    const productionsRes = await Promise.allSettled(uniqueProdIds.map(id => ProductionService.getProductionDetail(id)));

    const prodNameMap = new Map();
    productionsRes.forEach((res, idx) => {
      const pid = uniqueProdIds[idx];
      if (res.status === 'fulfilled') {
        const payload = res.value?.data?.data || res.value?.data;
        if (payload) {
          const name = payload.orderName || payload.pOrderName || payload.productName || payload.order?.orderName || "";
          if (name) prodNameMap.set(pid, name);
        }
      }
      if (!prodNameMap.has(pid) && listMap.has(pid)) {
        const lp = listMap.get(pid);
        const name = lp.orderName || lp.pOrderName || lp.productName || lp.order?.orderName || "";
        if (name) prodNameMap.set(pid, name);
      }
    });

    let totalQuantity = 0;
    let totalSalary = 0;
    const enrichedLogs = logs.map(l => {
      const qty = Number(l.quantity || 0);
      const cpu = Number(l.cpu || 0);
      const pid = String(l.productionId || l.prodId);
      totalQuantity += qty;
      if (l.isReadOnly || l.status === 2) totalSalary += qty * cpu;

      return {
        ...l,
        id: l.id || l.workLogId,
        reportDate: l.createDate || l.workDate || l.reportDate,
        productionId: pid,
        orderName: l.orderName || prodNameMap.get(pid) || `Đơn sản xuất #${pid}`,
      };
    }).sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate));

    return {
      userId: workerId,
      workerName: logs[0]?.workerName || `Thợ #${workerId}`,
      totalQuantity,
      totalSalary,
      logs: enrichedLogs
    };
  } catch (err) {
    const allData = await fetchAggregatedPayroll(targetMonth, targetYear);
    const found = allData.find(w => String(w.userId) === String(workerId));
    return found || { userId: workerId, workerName: `Thợ #${workerId}`, totalQuantity: 0, totalSalary: 0, logs: [] };
  }
};

export const getWorkerMonthlyDetail = (logs, userId, month, year) => {
  const targetMonth = Number(month);
  const targetYear = Number(year);
  return logs.filter((log) => {
    const d = parseSafeDate(log.reportDate || log.workDate);
    const keyMatch = String(log.workerId || log.userId) === String(userId);
    return keyMatch && d && (d.getMonth() + 1 === targetMonth) && (d.getFullYear() === targetYear);
  });
};
