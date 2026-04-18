import ProductionService from "@/services/ProductionService";
import ProductionPartService from "@/services/ProductionPartService";
import WorkerService from "@/services/WorkerService";

export const MOCK_PAYROLL_LOGS = [];



const isDateInMonth = (dateStr, month, year) => {
  if (!dateStr || dateStr === "-") return false;
  const d = new Date(dateStr);
  return d.getMonth() + 1 === month && d.getFullYear() === year;
};

const overlapsMonth = (startStr, endStr, month, year) => {
  const targetStart = new Date(year, month - 1, 1);
  const targetEnd = new Date(year, month, 0);
  const start = startStr && startStr !== "-" ? new Date(startStr) : null;
  const end = endStr && endStr !== "-" ? new Date(endStr) : null;
  if (!start && !end) return true;
  if (start && start > targetEnd) return false;
  if (end && end < targetStart) return false;
  return true;
};

export const fetchAggregatedPayroll = async (month, year) => {
  try {
    // 1. Fetch ALL Productions (Loop to bypass 100 limit)
    let allProductions = [];
    let prodIdx = 0;
    let hasMoreProds = true;
    while (hasMoreProds && prodIdx < 10) {
      try {
        const res = await ProductionService.getProductionList({ PageIndex: prodIdx, PageSize: 30 });
        const data = res?.data?.data || res?.data || [];
        if (Array.isArray(data) && data.length > 0) {
          allProductions = [...allProductions, ...data];
          hasMoreProds = data.length === 100;
          prodIdx++;
        } else {
          hasMoreProds = false;
        }
      } catch (err) {
        console.error("Error fetching productions:", err);
        hasMoreProds = false;
      }
    }

    const [workerDicRes, managerDicRes] = await Promise.all([
      WorkerService.getEmployeeDirectory({ includeHidden: true }),
      WorkerService.getManagerDirectory({ includeHidden: true }),
    ]);

    const workerDirectory = [
      ...(workerDicRes?.data || []),
      ...(managerDicRes?.data || [])
    ];

    const workerProfileMap = new Map();
    workerDirectory.forEach(w => {
      if (!w.id) return;
      const key = String(w.id);
      const existing = workerProfileMap.get(key);
      if (!existing || (w.fullName && w.fullName !== "Chưa cập nhật")) {
        workerProfileMap.set(key, w);
      }
    });

    if (allProductions.length === 0) return [];

    const productions = allProductions.filter(p =>
      overlapsMonth(p.startDate || p.pStartDate, p.endDate || p.pEndDate, month, year)
    );

    const partsResults = await Promise.all(
      productions.map(p => ProductionPartService.getPartsByProduction(p.productionId || p.id, { PageSize: 100 }))
    );

    const relevantParts = [];
    partsResults.forEach((res, idx) => {
      const parts = res?.data?.data || res?.data || [];
      const prod = productions[idx];
      if (Array.isArray(parts)) {
        parts.forEach(part => {
          if (overlapsMonth(part.startDate || part.planStartDate, part.endDate || part.planEndDate, month, year)) {
            relevantParts.push({
              ...part,
              productionId: prod.productionId || prod.id,
              orderName: prod.order?.orderName || prod.orderName || "-",
              orderId: prod.order?.id || prod.orderId || null,
            });
          }
        });
      }
    });

    // 3. Fetch all work logs for EACH VARIANT in parallel chunks
    const allLogsList = [];

    await Promise.all(relevantParts.map(async (part) => {
      const variants = Array.isArray(part.listPartOrderSizes) ? part.listPartOrderSizes : [];
      for (const variant of variants) {
        let lIdx = 0;
        let hasMoreLogs = true;
        while (hasMoreLogs && lIdx < 10) {
          try {
            const res = await ProductionPartService.getWorkLogs(part.id, variant.id, { PageIndex: lIdx, PageSize: 100 });
            const pageData = res?.data?.data || res?.data || [];
            if (Array.isArray(pageData) && pageData.length > 0) {
              pageData.forEach(log => {
                const d = new Date(log.createDate || log.workDate || log.reportDate);
                if (d.getMonth() + 1 === month && d.getFullYear() === year) {
                  const uid = log.userId || log.uId || log.accountId;
                  if (!uid) return;

                  allLogsList.push({
                    ...log,
                    id: log.id || log.workLogId,
                    partId: part.id,
                    productionPartId: part.id,
                    partOrderSizeId: variant.id,
                    partName: log.partName || part.partName || part.name,
                    variantName: log.color && log.size ? `${log.color} / ${log.size}` : `${variant.color || ""} / ${variant.size || ""}`,
                    cpu: part.cpu || 0,
                    productionId: part.productionId,
                    orderName: part.orderName,
                    orderId: part.orderId,
                    workerId: uid,
                    workerName: log.workerName || log.userName || `Thợ #${uid}`,
                    quantity: log.quantity || 0,
                    reportDate: log.createDate || log.workDate || log.reportDate,
                    isPayment: log.isPayment || !!log.paidAt,
                    isReadOnly: !!log.isReadOnly,
                  });
                }
              });
              hasMoreLogs = pageData.length === 100;
              lIdx++;
            } else {
              hasMoreLogs = false;
            }
          } catch (e) {
            console.error("Error fetching logs for variant in payroll:", e);
            hasMoreLogs = false;
          }
        }
      }
    }));

    // 4. Aggregate by worker
    const workerMap = new Map();
    allLogsList.forEach(log => {
      const key = String(log.workerId || log.workerName);
      if (!workerMap.has(key)) {
        workerMap.set(key, {
          userId: log.workerId,
          workerName: log.workerName,
          totalQuantity: 0,
          totalSalary: 0,
          logCount: 0,
          uniqueParts: new Set(),
          uniquePartCount: 0,
          logs: [],
        });
      }
      const stats = workerMap.get(key);
      const qty = Number(log.quantity || 0);
      const cpu = Number(log.cpu || 0);

      stats.totalQuantity += qty;
      if (log.isReadOnly) {
        stats.totalSalary += qty * cpu;
      }
      stats.logCount += 1;
      if (log.partId) stats.uniqueParts.add(log.partId);
      stats.uniquePartCount = stats.uniqueParts.size;

      const profile = workerProfileMap.get(String(log.workerId));
      if (profile) {
        if (profile.fullName && profile.fullName !== "Chưa cập nhật") stats.fullName = profile.fullName;
        if (profile.avatarUrl) stats.avatarUrl = profile.avatarUrl;
      }

      stats.logs.push(log);
    });

    const result = Array.from(workerMap.values());
    return result;
  } catch (err) {
    console.error("Payroll aggregation error:", err);
    throw err;
  }
};

export const getWorkerMonthlyDetail = (logs, userId, month, year) => {
  return logs.filter((log) => {
    const d = new Date(log.reportDate || log.workDate);
    const keyMatch = String(log.workerId || log.workerName) === String(userId);
    return keyMatch && d.getMonth() + 1 === month && d.getFullYear() === year;
  });
};
