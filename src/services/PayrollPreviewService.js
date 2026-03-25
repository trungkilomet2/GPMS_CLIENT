import ProductionPartService from "@/services/ProductionPartService";
import ProductionService from "@/services/ProductionService";
import WorkerService from "@/services/WorkerService";
import { normalizeMonthValue } from "@/lib/payroll";

const AVATAR_TONES = ["emerald", "amber", "sky", "rose", "violet", "teal", "slate", "cobalt"];
const PAYROLL_OWNER = {
  id: "owner-preview",
  fullName: "Owner",
  role: "Owner",
};
const PAYROLL_PAYMENT_STORAGE_KEY = "gpms-payroll-payment-overrides";

let payrollPreviewCache = null;
let payrollPreviewPromise = null;

function getStorageSafe() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function buildOverrideKey(employeeId, month) {
  return `${String(employeeId ?? "").toLowerCase()}:${normalizeMonthValue(month)}`;
}

function loadPaymentOverrides() {
  try {
    const storage = getStorageSafe();
    const raw = storage?.getItem(PAYROLL_PAYMENT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePaymentOverrides(overrides) {
  try {
    const storage = getStorageSafe();
    storage?.setItem(PAYROLL_PAYMENT_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore storage errors
  }
}

function applyPaymentOverrides(records = []) {
  const overrides = loadPaymentOverrides();

  return (Array.isArray(records) ? records : []).map((record) => {
    const overridePaidAt = overrides[buildOverrideKey(record.employeeId, record.month)];
    if (!overridePaidAt) return record;

    return {
      ...record,
      status: "paid",
      paidAt: overridePaidAt,
      workflow: {
        ...record.workflow,
        approvedByOwnerAt: overridePaidAt,
      },
    };
  });
}

function extractDataList(payload) {
  const list =
    payload?.data ??
    payload?.items ??
    payload?.list ??
    payload?.results ??
    payload?.records ??
    [];

  return Array.isArray(list) ? list : [];
}

function toMonthKey(value) {
  if (!value) return "";
  return normalizeMonthValue(String(value).slice(0, 7));
}

function normalizePart(part = {}) {
  return {
    partId: part?.id ?? part?.partId ?? null,
    partName: part?.name ?? part?.partName ?? part?.title ?? "Công đoạn",
    cpu: Number(part?.cpu ?? part?.unitPrice ?? part?.price ?? 0) || 0,
  };
}

function resolveProductionMeta(item = {}) {
  const order = item?.order ?? {};
  const pm = item?.pm ?? item?.pmInfo ?? {};

  return {
    productionId: item?.productionId ?? item?.id ?? null,
    orderName: order?.orderName ?? item?.orderName ?? order?.name ?? "Đơn hàng",
    pmName: pm?.fullName ?? pm?.name ?? item?.pmName ?? "Chưa phân công",
  };
}

function resolveAvatarTone(userId) {
  const numericId = Number(userId);
  if (Number.isFinite(numericId)) {
    return AVATAR_TONES[Math.abs(numericId) % AVATAR_TONES.length];
  }
  return AVATAR_TONES[0];
}

function buildWorkflow(pmName, workDate, isPaid) {
  return {
    pmId: null,
    pmName: pmName || "Chưa phân công",
    pmRole: "PM",
    ownerId: PAYROLL_OWNER.id,
    ownerName: PAYROLL_OWNER.fullName,
    ownerRole: PAYROLL_OWNER.role,
    reviewedByPmAt: workDate || null,
    approvedByOwnerAt: isPaid ? workDate || null : null,
    sourceTables: ["PART_WORK_LOG"],
  };
}

function normalizeEmployeeDirectory(employees = []) {
  const byId = new Map();
  (Array.isArray(employees) ? employees : []).forEach((employee) => {
    byId.set(String(employee.id), employee);
  });
  return byId;
}

async function fetchAllProductions(maxPages = 20, pageSize = 50) {
  const allItems = [];
  const seenKeys = new Set();
  let pageIndex = 0;
  let recordCount = null;

  while (pageIndex < maxPages) {
    const response = await ProductionService.getProductionList({
      PageIndex: pageIndex,
      PageSize: pageSize,
      SortColumn: "Name",
      SortOrder: "ASC",
    }, {
      timeout: 10000,
    });

    const payload = response?.data ?? response;
    const list = extractDataList(payload);
    let added = 0;

    list.forEach((item) => {
      const key = item?.productionId ?? item?.id ?? JSON.stringify(item);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      allItems.push(item);
      added += 1;
    });

    if (recordCount == null) {
      const reported = Number(payload?.recordCount ?? payload?.totalCount ?? 0);
      recordCount = Number.isFinite(reported) && reported > 0 ? reported : null;
    }

    if (list.length === 0 || added === 0) break;
    if (recordCount != null && allItems.length >= recordCount) break;
    if (list.length < pageSize) break;

    pageIndex += 1;
  }

  return allItems;
}

function buildAggregatedRecords(entries, employeesById) {
  const map = new Map();

  entries.forEach((entry) => {
    const month = toMonthKey(entry.workDate);
    if (!month) return;

    const employeeId = String(entry.userId ?? "").toLowerCase();
    if (!employeeId) return;

    const employee = employeesById.get(String(entry.userId));
    const key = `${employeeId}:${month}`;
    const baseRecord = map.get(key) ?? {
      employeeId,
      employeeCode: String(employee?.userName ?? `USER-${entry.userId}`).toUpperCase(),
      fullName: employee?.fullName ?? `Nhân viên #${entry.userId}`,
      avatarTone: resolveAvatarTone(entry.userId),
      team: employee?.workerSkillLabel ?? employee?.primaryRoleLabel ?? "Chưa cập nhật",
      month,
      grossIncome: 0,
      netIncome: 0,
      status: "pending",
      note: "Bảng lương tạm tính từ sản lượng đầu ra do worker xác nhận, tính theo quantity x cpu.",
      createdAt: entry.workDate,
      paidAt: null,
      employeeRole: "Worker",
      workflow: buildWorkflow(entry.pmName, entry.workDate, entry.isPayment),
      workItems: [],
      _pmNames: new Set(),
      _hasPending: false,
      _hasPaid: false,
    };

    baseRecord.grossIncome += entry.total;
    baseRecord.netIncome = baseRecord.grossIncome;
    baseRecord.createdAt = !baseRecord.createdAt || String(entry.workDate) < String(baseRecord.createdAt)
      ? entry.workDate
      : baseRecord.createdAt;

    if (entry.pmName) baseRecord._pmNames.add(entry.pmName);
    if (entry.isPayment) {
      baseRecord._hasPaid = true;
      baseRecord.paidAt = !baseRecord.paidAt || String(entry.workDate) > String(baseRecord.paidAt)
        ? entry.workDate
        : baseRecord.paidAt;
    } else {
      baseRecord._hasPending = true;
    }

    baseRecord.workItems.push({
      id: entry.id,
      name: entry.partName,
      planCode: `#PR-${entry.productionId}`,
      productName: entry.orderName,
      quantity: entry.quantity,
      unitPrice: entry.cpu,
      total: entry.total,
      workDate: entry.workDate,
      sourceLabel: entry.sourceLabel,
    });

    map.set(key, baseRecord);
  });

  return Array.from(map.values())
    .map((record) => {
      const pmNames = Array.from(record._pmNames);
      const pmName = pmNames.length > 1 ? "Nhiều PM" : (pmNames[0] ?? record.workflow.pmName);
      const status = !record._hasPending && record._hasPaid ? "paid" : "pending";

      return {
        ...record,
        status,
        paidAt: status === "paid" ? record.paidAt : null,
        workflow: {
          ...record.workflow,
          pmName,
          approvedByOwnerAt: status === "paid" ? record.paidAt : null,
        },
      };
    })
    .sort((a, b) => {
      const monthCompare = String(b.month).localeCompare(String(a.month));
      if (monthCompare !== 0) return monthCompare;
      return b.netIncome - a.netIncome;
    });
}

async function buildPayrollPreviewRecords() {
  const [productions, employeesResponse] = await Promise.all([
    fetchAllProductions(),
    WorkerService.getAllEmployees().catch(() => ({ data: [] })),
  ]);
  const employeesById = normalizeEmployeeDirectory(employeesResponse?.data ?? []);
  const allEntries = [];

  for (const production of productions) {
    const meta = resolveProductionMeta(production);
    if (!meta.productionId) continue;

    try {
      const partsRes = await ProductionPartService.getPartsByProduction(meta.productionId);
      const parts = extractDataList(partsRes?.data ?? partsRes).map(normalizePart).filter((part) => part.partId);

      const partLogEntries = await Promise.all(parts.map(async (part) => {
        try {
          const logsRes = await ProductionPartService.getWorkLogs(part.partId);
          const logs = extractDataList(logsRes?.data ?? logsRes);

          return logs.map((log) => {
            const quantity = Number(log?.quantity ?? 0) || 0;
            const cpu = Number(part.cpu ?? 0) || 0;
            return {
              id: `part-${part.partId}-${log?.id ?? Math.random()}`,
              productionId: meta.productionId,
              orderName: meta.orderName,
              pmName: meta.pmName,
              userId: log?.userId,
              partName: part.partName,
              quantity,
              cpu,
              total: quantity * cpu,
              workDate: log?.workDate ?? log?.dateCreate ?? null,
              isPayment: Boolean(log?.isPayment),
              sourceLabel: "Log công đoạn",
            };
          }).filter((item) => item.userId && item.quantity > 0);
        } catch {
          return [];
        }
      }));

      partLogEntries.flat().forEach((entry) => allEntries.push(entry));

    } catch {
      // ignore a single production failure and continue aggregating others
    }
  }

  return buildAggregatedRecords(allEntries, employeesById);
}

const PayrollPreviewService = {
  async getPayrollPreviewRecords(options = {}) {
    if (options?.force) {
      payrollPreviewCache = null;
      payrollPreviewPromise = null;
    }

    if (payrollPreviewCache && !options?.force) {
      return payrollPreviewCache;
    }

    if (payrollPreviewPromise) {
      return payrollPreviewPromise;
    }

    payrollPreviewPromise = buildPayrollPreviewRecords()
      .then((records) => {
        payrollPreviewCache = applyPaymentOverrides(Array.isArray(records) ? records : []);
        return payrollPreviewCache;
      })
      .finally(() => {
        payrollPreviewPromise = null;
      });

    return payrollPreviewPromise;
  },

  async markPayrollAsPaid(employeeId, month, paidAt = new Date().toISOString()) {
    const normalizedMonth = normalizeMonthValue(month);
    const overrides = loadPaymentOverrides();
    overrides[buildOverrideKey(employeeId, normalizedMonth)] = paidAt;
    savePaymentOverrides(overrides);

    const records = await this.getPayrollPreviewRecords();
    const nextRecords = applyPaymentOverrides(records);
    payrollPreviewCache = nextRecords;
    return nextRecords;
  },
};

export default PayrollPreviewService;
