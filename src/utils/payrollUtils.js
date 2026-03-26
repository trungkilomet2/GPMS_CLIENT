import ProductionService from "@/services/ProductionService";
import ProductionPartService from "@/services/ProductionPartService";
import WorkerService from "@/services/WorkerService";

export const MOCK_PAYROLL_LOGS = [
  // ... existing mock data kept for safety/development fallback
];

/**
 * Aggregates data from multiple APIs to build a payroll view.
 * 1. Fetch all productions
 * 2. Fetch all parts for each production
 * 3. Fetch all work logs for each part
 * 4. Filter by month/year and aggregate
 */
export const fetchAggregatedPayroll = async (month, year) => {
  try {
    // 1. Fetch Productions (large batch)
    const prodRes = await ProductionService.getProductionList({ PageIndex: 0, PageSize: 100 });
    const productions = prodRes?.data?.data || prodRes?.data || [];
    if (!Array.isArray(productions)) return [];

    // 2. Fetch all parts for all productions in parallel
    const partsResults = await Promise.all(
      productions.map(p => ProductionPartService.getPartsByProduction(p.productionId || p.id, { PageSize: 100 }))
    );

    const allParts = [];
    partsResults.forEach((res, idx) => {
      const parts = res?.data?.data || res?.data || [];
      const prod = productions[idx];
      if (Array.isArray(parts)) {
        parts.forEach(part => {
          allParts.push({
            ...part,
            productionId: prod.productionId || prod.id,
            orderName: prod.order?.orderName || prod.orderName || "-",
            orderId: prod.order?.id || prod.orderId || null,
          });
        });
      }
    });

    // 3. Fetch all work logs for all parts in parallel
    // WARNING: This could be many requests. 
    const logsResults = await Promise.all(
      allParts.map(part => ProductionPartService.getWorkLogs(part.id))
    );

    const allLogs = [];
    logsResults.forEach((res, idx) => {
      const part = allParts[idx];
      const rawLogs = res?.data?.data || res?.data || [];
      if (Array.isArray(rawLogs)) {
        rawLogs.forEach(log => {
          const d = new Date(log.workDate || log.reportDate);
          if (d.getMonth() + 1 === month && d.getFullYear() === year) {
            allLogs.push({
              ...log,
              partId: part.id,
              partName: part.partName || part.name,
              cpu: part.cpu || 0,
              productionId: part.productionId,
              orderName: part.orderName,
              orderId: part.orderId,
              workerName: log.workerName || log.userName || `Thợ #${log.userId}`,
              quantity: log.quantity || 0,
              reportDate: log.workDate || log.reportDate,
            });
          }
        });
      }
    });

    // 4. Aggregate by worker
    const workerMap = new Map();
    allLogs.forEach(log => {
      const key = String(log.userId || log.workerName);
      if (!workerMap.has(key)) {
        workerMap.set(key, {
          userId: log.userId,
          workerName: log.workerName,
          totalQuantity: 0,
          totalSalary: 0,
          logCount: 0,
          logs: [],
        });
      }
      const stats = workerMap.get(key);
      const qty = Number(log.quantity || 0);
      const cpu = Number(log.cpu || 0);
      stats.totalQuantity += qty;
      stats.totalSalary += qty * cpu;
      stats.logCount += 1;
      stats.logs.push(log);
    });

    return Array.from(workerMap.values());
  } catch (err) {
    console.error("Payroll aggregation error:", err);
    throw err;
  }
};

export const aggregateMonthlyPayroll = (logs, month, year) => {
  // Keeping this for backward compatibility or filtering fetched logs
  const filtered = logs.filter((log) => {
    const d = new Date(log.reportDate);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const workerMap = new Map();
  filtered.forEach((log) => {
    const key = log.userId || log.workerName;
    if (!workerMap.has(key)) {
      workerMap.set(key, {
        userId: log.userId,
        workerName: log.workerName,
        totalQuantity: 0,
        totalSalary: 0,
        logCount: 0,
      });
    }
    const stats = workerMap.get(key);
    stats.totalQuantity += log.quantity;
    stats.totalSalary += log.quantity * log.cpu;
    stats.logCount += 1;
  });

  return Array.from(workerMap.values());
};

export const getWorkerMonthlyDetail = (logs, userId, month, year) => {
  return logs.filter((log) => {
    const d = new Date(log.reportDate || log.workDate);
    const keyMatch = String(log.userId || log.workerName) === String(userId) || log.workerName === userId;
    return keyMatch && d.getMonth() + 1 === month && d.getFullYear() === year;
  });
};
