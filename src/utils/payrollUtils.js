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
const payrollCache = new Map();

/**
 * Checks if a given month/year is within the start and end dates.
 * Handle open-ended ranges or nulls.
 */
const isDateInMonth = (dateStr, month, year) => {
  if (!dateStr || dateStr === "-") return false;
  const d = new Date(dateStr);
  return d.getMonth() + 1 === month && d.getFullYear() === year;
};

const overlapsMonth = (startStr, endStr, month, year) => {
  const targetStart = new Date(year, month - 1, 1);
  const targetEnd = new Date(year, month, 0); // Last day of month

  const start = startStr && startStr !== "-" ? new Date(startStr) : null;
  const end = endStr && endStr !== "-" ? new Date(endStr) : null;

  // If no start date, we can't be sure, but let's assume it's relevant if end exists
  if (!start && !end) return true; // Fallback to include if totally unknown
  
  if (start && start > targetEnd) return false;
  if (end && end < targetStart) return false;

  return true;
};

/**
 * Aggregates data from multiple APIs to build a payroll view.
 * 1. Fetch all productions
 * 2. Filter productions active in this month/year
 * 3. Fetch parts for active productions
 * 4. Fetch work logs for active parts
 * 5. Aggregate by worker
 */
export const fetchAggregatedPayroll = async (month, year, forceRefresh = false) => {
  const cacheKey = `${month}-${year}`;
  if (!forceRefresh && payrollCache.has(cacheKey)) {
    console.debug(`[Payroll] Returning cached data for ${cacheKey}`);
    return payrollCache.get(cacheKey);
  }

  try {
    // 1. Fetch Productions and Worker Profiles
    const [prodRes, workerDicRes] = await Promise.all([
      ProductionService.getProductionList({ PageIndex: 0, PageSize: 100 }),
      WorkerService.getEmployeeDirectory({ includeHidden: true }),
    ]);

    const rawProductions = prodRes?.data?.data || prodRes?.data || [];
    const workerDirectory = workerDicRes?.data || [];
    const workerProfileMap = new Map();
    workerDirectory.forEach(w => {
      const key = String(w.id || w.userName);
      workerProfileMap.set(key, w);
    });

    if (!Array.isArray(rawProductions)) return [];

    // Filter relevant productions to reduce part/log requests
    const productions = rawProductions.filter(p => 
      overlapsMonth(p.startDate || p.pStartDate, p.endDate || p.pEndDate, month, year)
    );

    console.debug(`[Payroll] Processing ${productions.length}/${rawProductions.length} productions for ${month}/${year}`);

    // 2. Fetch all parts for relevant productions in parallel
    const partsResults = await Promise.all(
      productions.map(p => ProductionPartService.getPartsByProduction(p.productionId || p.id, { PageSize: 100 }))
    );

    const relevantParts = [];
    partsResults.forEach((res, idx) => {
      const parts = res?.data?.data || res?.data || [];
      const prod = productions[idx];
      if (Array.isArray(parts)) {
        parts.forEach(part => {
          // Only fetch logs if the part schedule overlaps with the month
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

    console.debug(`[Payroll] Processing ${relevantParts.length} parts for ${month}/${year}`);

    // 3. Fetch all work logs for relevant parts in parallel
    const logsResults = await Promise.all(
      relevantParts.map(part => ProductionPartService.getWorkLogs(part.id))
    );

    const allLogs = [];
    logsResults.forEach((res, idx) => {
      const part = relevantParts[idx];
      const rawLogs = res?.data?.data || res?.data || [];
      if (Array.isArray(rawLogs)) {
        rawLogs.forEach(log => {
          const d = new Date(log.workDate || log.reportDate);
          if (d.getMonth() + 1 === month && d.getFullYear() === year) {
            const logEntry = {
              ...log,
              partId: part.id,
              partName: part.partName || part.name,
              cpu: part.cpu || 0,
              productionId: part.productionId,
              orderName: part.orderName,
              orderId: part.orderId,
              workerId: log.userId,
              workerName: log.workerName || log.userName || `Thợ #${log.userId}`,
              quantity: log.quantity || 0,
              reportDate: log.workDate || log.reportDate,
              workerFullName: null,
              workerAvatar: null,
            };

            // Enhance with profile
            const profile = workerProfileMap.get(String(log.userId));
            if (profile) {
              logEntry.workerFullName = profile.fullName;
              logEntry.workerAvatar = profile.avatarUrl;
            }

            allLogs.push(logEntry);
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
      
      if (log.workerFullName && !stats.fullName) stats.fullName = log.workerFullName;
      if (log.workerAvatar && !stats.avatarUrl) stats.avatarUrl = log.workerAvatar;

      stats.logs.push(log);
    });

    const result = Array.from(workerMap.values());
    payrollCache.set(cacheKey, result);
    return result;
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
