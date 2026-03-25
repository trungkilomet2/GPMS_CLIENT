export const PAYROLL_PAGE_SIZE = 10;

export function normalizeMonthValue(month) {
  if (!month) return "";
  const [year, rawMonth] = String(month).split("-");
  if (!year || !rawMonth) return "";

  return `${year}-${String(rawMonth).padStart(2, "0")}`;
}

export function getCurrentMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatCurrency(value = 0) {
  return `₫${Number(value || 0).toLocaleString("en-US")}`;
}

export function formatMonthLabel(month) {
  const normalized = normalizeMonthValue(month);
  if (!normalized) return "--/----";

  const [year, rawMonth] = normalized.split("-");
  return `${rawMonth}/${year}`;
}

export function formatDateLabel(value) {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  return date.toLocaleDateString("vi-VN");
}

export function getPayrollFlowLabel(record) {
  if (!record?.workflow) return "Worker -> PM -> Owner";

  return `${record.employeeRole ?? "Worker"} -> ${record.workflow.pmRole ?? "PM"} -> ${record.workflow.ownerRole ?? "Owner"}`;
}

export function getPayrollInitials(name = "") {
  return name
    .split(" ")
    .map((item) => item[0])
    .filter(Boolean)
    .slice(-2)
    .join("")
    .toUpperCase();
}

export function normalizeSearchText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function getPayrollMonths(records = []) {
  return Array.from(
    new Set((Array.isArray(records) ? records : []).map((record) => record.month).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));
}

export function getLatestPayrollMonth(records = []) {
  return getPayrollMonths(records)[0] ?? "";
}

export function getPreviousPayrollMonth(month, records = []) {
  const normalized = normalizeMonthValue(month);
  const months = getPayrollMonths(records);
  const index = months.indexOf(normalized);

  if (index === -1 || index === months.length - 1) {
    return "";
  }

  return months[index + 1];
}

export function getPayrollRecordsByMonth(records = [], month) {
  const normalized = normalizeMonthValue(month);
  return (Array.isArray(records) ? records : []).filter((record) => record.month === normalized);
}

export function getPayrollRecord(records = [], employeeId, month) {
  const normalizedId = String(employeeId ?? "").toLowerCase();
  const normalizedMonth = normalizeMonthValue(month);

  return (Array.isArray(records) ? records : []).find((record) => (
    record.employeeId === normalizedId && record.month === normalizedMonth
  )) ?? null;
}

export function getLatestPayrollRecordForEmployee(records = [], employeeId) {
  const normalizedId = String(employeeId ?? "").toLowerCase();

  return (Array.isArray(records) ? records : [])
    .filter((record) => record.employeeId === normalizedId)
    .sort((recordA, recordB) => recordB.month.localeCompare(recordA.month))[0] ?? null;
}

function sumBy(records, selector) {
  return records.reduce((total, record) => total + selector(record), 0);
}

export function getPayrollSummary(records = [], month) {
  const currentMonth = normalizeMonthValue(month);
  const previousMonth = getPreviousPayrollMonth(currentMonth, records);
  const currentRecords = getPayrollRecordsByMonth(records, currentMonth);
  const previousRecords = previousMonth ? getPayrollRecordsByMonth(records, previousMonth) : [];
  const totalPayroll = sumBy(currentRecords, (record) => record.netIncome);
  const previousTotalPayroll = sumBy(previousRecords, (record) => record.netIncome);
  const paidCount = currentRecords.filter((record) => record.status === "paid").length;
  const pendingCount = currentRecords.filter((record) => record.status === "pending").length;
  const currentEmployeeIds = new Set(currentRecords.map((record) => record.employeeId));
  const previousEmployeeIds = new Set(previousRecords.map((record) => record.employeeId));
  const newEmployeeCount = Array.from(currentEmployeeIds).filter((id) => !previousEmployeeIds.has(id)).length;
  const totalChange = previousTotalPayroll
    ? ((totalPayroll - previousTotalPayroll) / previousTotalPayroll) * 100
    : null;

  return {
    totalPayroll,
    totalChange,
    payrollCreated: currentRecords.length,
    paidCount,
    pendingCount,
    employeeCount: currentEmployeeIds.size,
    newEmployeeCount,
    previousMonth,
  };
}

function escapeCsvValue(value) {
  const plainValue = String(value ?? "");
  if (!/[",\n]/.test(plainValue)) return plainValue;

  return `"${plainValue.replace(/"/g, "\"\"")}"`;
}

export function downloadPayrollCsv(records, month, fileName) {
  const safeMonth = normalizeMonthValue(month) || "ky-luong";
  const rows = Array.isArray(records) ? records : [];
  const header = [
    "Ma nhan vien",
    "Nhan vien",
    "To bo phan",
    "So cong doan",
    "Tong tien cong tam tinh",
    "Tong tam tinh",
    "Trang thai",
    "Ghi chu",
  ];

  const body = rows.map((record) => ([
    record.employeeCode,
    record.fullName,
    record.team,
    record.workItems.length,
    record.grossIncome,
    record.netIncome,
    record.status === "paid" ? "Da danh dau thanh toan" : "Tam tinh",
    record.note,
  ]));

  const csvContent = [header, ...body]
    .map((line) => line.map(escapeCsvValue).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName || `bang-luong-tam-tinh-${safeMonth}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
