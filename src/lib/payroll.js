const PAYROLL_RECORDS = [
  {
    employeeId: "nv001",
    employeeCode: "NV001",
    fullName: "Nguyen Van An",
    avatarTone: "emerald",
    team: "To may 1",
    month: "2026-03",
    grossIncome: 8000000,
    allowance: 500000,
    netIncome: 8500000,
    status: "paid",
    note: "Thuong nang suat cao, hoan thanh truoc ke hoach.",
    createdAt: "2026-03-05",
    paidAt: "2026-03-12",
    workItems: [
      {
        id: "nv001-1",
        name: "May gau ao",
        planCode: "#PP-001",
        productName: "Ao phong",
        quantity: 1000,
        unitPrice: 3000,
        total: 3000000,
      },
      {
        id: "nv001-2",
        name: "Lap tay ao",
        planCode: "#PP-018",
        productName: "Ao polo",
        quantity: 1100,
        unitPrice: 4545,
        total: 5000000,
      },
    ],
  },
  {
    employeeId: "nv002",
    employeeCode: "NV002",
    fullName: "Tran Thi Binh",
    avatarTone: "amber",
    team: "To may 1",
    month: "2026-03",
    grossIncome: 12000000,
    allowance: 1200000,
    netIncome: 13200000,
    status: "pending",
    note: "Cho doi chieu lai san luong cua cong doan cat vien.",
    createdAt: "2026-03-05",
    paidAt: null,
    workItems: [
      {
        id: "nv002-1",
        name: "May than truoc",
        planCode: "#PP-021",
        productName: "Ao hoodie",
        quantity: 1600,
        unitPrice: 7500,
        total: 12000000,
      },
    ],
  },
  {
    employeeId: "nv003",
    employeeCode: "NV003",
    fullName: "Le Minh Cuong",
    avatarTone: "sky",
    team: "To may 2",
    month: "2026-03",
    grossIncome: 15000000,
    allowance: 800000,
    netIncome: 15800000,
    status: "paid",
    note: "Dat 103% ke hoach va khong phat sinh loi hoan thien.",
    createdAt: "2026-03-05",
    paidAt: "2026-03-13",
    workItems: [
      {
        id: "nv003-1",
        name: "Rap than sau",
        planCode: "#PP-004",
        productName: "Ao khoac gio",
        quantity: 900,
        unitPrice: 6000,
        total: 5400000,
      },
      {
        id: "nv003-2",
        name: "May tui hop",
        planCode: "#PP-011",
        productName: "Quan kaki",
        quantity: 1300,
        unitPrice: 4200,
        total: 5460000,
      },
      {
        id: "nv003-3",
        name: "Can suon",
        planCode: "#PP-037",
        productName: "Ao gio",
        quantity: 950,
        unitPrice: 4358,
        total: 4140000,
      },
    ],
  },
  {
    employeeId: "nv004",
    employeeCode: "NV004",
    fullName: "Pham Thi Dung",
    avatarTone: "rose",
    team: "To may 2",
    month: "2026-03",
    grossIncome: 7500000,
    allowance: 300000,
    netIncome: 7800000,
    status: "pending",
    note: "Can bo sung xac nhan thuong ngay tang ca.",
    createdAt: "2026-03-05",
    paidAt: null,
    workItems: [
      {
        id: "nv004-1",
        name: "May co ao",
        planCode: "#PP-019",
        productName: "Ao so mi",
        quantity: 500,
        unitPrice: 4500,
        total: 2250000,
      },
      {
        id: "nv004-2",
        name: "Tra nap tui",
        planCode: "#PP-025",
        productName: "Chan vay",
        quantity: 700,
        unitPrice: 2800,
        total: 1960000,
      },
      {
        id: "nv004-3",
        name: "Len line hoan thien",
        planCode: "#PP-033",
        productName: "Ao phong",
        quantity: 1200,
        unitPrice: 2742,
        total: 3290000,
      },
    ],
  },
  {
    employeeId: "nv005",
    employeeCode: "NV005",
    fullName: "Hoang Quoc Viet",
    avatarTone: "violet",
    team: "To dong goi",
    month: "2026-03",
    grossIncome: 10300000,
    allowance: 700000,
    netIncome: 11000000,
    status: "paid",
    note: "Thuong ho tro line dong goi cuoi tuan.",
    createdAt: "2026-03-05",
    paidAt: "2026-03-12",
    workItems: [
      {
        id: "nv005-1",
        name: "Gap thanh pham",
        planCode: "#PP-014",
        productName: "Ao thun basic",
        quantity: 2200,
        unitPrice: 2100,
        total: 4620000,
      },
      {
        id: "nv005-2",
        name: "Dong goi carton",
        planCode: "#PP-014",
        productName: "Ao thun basic",
        quantity: 2100,
        unitPrice: 2705,
        total: 5680000,
      },
    ],
  },
  {
    employeeId: "nv006",
    employeeCode: "NV006",
    fullName: "Dang My Linh",
    avatarTone: "teal",
    team: "To cat",
    month: "2026-03",
    grossIncome: 9000000,
    allowance: 400000,
    netIncome: 9400000,
    status: "paid",
    note: "On dinh san luong, khong co sai lech dinh muc.",
    createdAt: "2026-03-05",
    paidAt: "2026-03-11",
    workItems: [
      {
        id: "nv006-1",
        name: "Cat than truoc",
        planCode: "#PP-022",
        productName: "Vay cong so",
        quantity: 850,
        unitPrice: 4700,
        total: 3995000,
      },
      {
        id: "nv006-2",
        name: "Cat lot tui",
        planCode: "#PP-041",
        productName: "Quan short",
        quantity: 1400,
        unitPrice: 3575,
        total: 5005000,
      },
    ],
  },
  {
    employeeId: "nv007",
    employeeCode: "NV007",
    fullName: "Bui Xuan Tung",
    avatarTone: "slate",
    team: "To hoan thien",
    month: "2026-03",
    grossIncome: 9500000,
    allowance: 600000,
    netIncome: 10100000,
    status: "pending",
    note: "Can duyet them muc thuong chuyen can.",
    createdAt: "2026-03-05",
    paidAt: null,
    workItems: [
      {
        id: "nv007-1",
        name: "Kiem loi cuoi chuyen",
        planCode: "#PP-007",
        productName: "Ao gio",
        quantity: 1250,
        unitPrice: 4200,
        total: 5250000,
      },
      {
        id: "nv007-2",
        name: "La dinh hinh",
        planCode: "#PP-007",
        productName: "Ao gio",
        quantity: 1100,
        unitPrice: 3864,
        total: 4250000,
      },
    ],
  },
  {
    employeeId: "nv008",
    employeeCode: "NV008",
    fullName: "Vu Ngoc Ha",
    avatarTone: "cobalt",
    team: "To may 3",
    month: "2026-03",
    grossIncome: 11600000,
    allowance: 1000000,
    netIncome: 12600000,
    status: "paid",
    note: "Nhan vien moi nhung dat nhip san xuat rat tot.",
    createdAt: "2026-03-05",
    paidAt: "2026-03-13",
    workItems: [
      {
        id: "nv008-1",
        name: "May suon than",
        planCode: "#PP-044",
        productName: "Dam cong so",
        quantity: 800,
        unitPrice: 5200,
        total: 4160000,
      },
      {
        id: "nv008-2",
        name: "May line tay",
        planCode: "#PP-044",
        productName: "Dam cong so",
        quantity: 780,
        unitPrice: 4308,
        total: 3360000,
      },
      {
        id: "nv008-3",
        name: "Dinh khuy hoan thien",
        planCode: "#PP-048",
        productName: "Ao blouse",
        quantity: 1200,
        unitPrice: 3400,
        total: 4080000,
      },
    ],
  },
  {
    employeeId: "nv001",
    employeeCode: "NV001",
    fullName: "Nguyen Van An",
    avatarTone: "emerald",
    team: "To may 1",
    month: "2026-02",
    grossIncome: 7600000,
    allowance: 400000,
    netIncome: 8000000,
    status: "paid",
    note: "San luong on dinh trong ky luong truoc.",
    createdAt: "2026-02-05",
    paidAt: "2026-02-12",
    workItems: [
      {
        id: "nv001-feb-1",
        name: "May gau ao",
        planCode: "#PP-001",
        productName: "Ao phong",
        quantity: 950,
        unitPrice: 3000,
        total: 2850000,
      },
      {
        id: "nv001-feb-2",
        name: "Lap tay ao",
        planCode: "#PP-018",
        productName: "Ao polo",
        quantity: 1050,
        unitPrice: 4524,
        total: 4750000,
      },
    ],
  },
  {
    employeeId: "nv002",
    employeeCode: "NV002",
    fullName: "Tran Thi Binh",
    avatarTone: "amber",
    team: "To may 1",
    month: "2026-02",
    grossIncome: 11400000,
    allowance: 700000,
    netIncome: 12100000,
    status: "paid",
    note: "Da duyet bo sung phu cap tan can.",
    createdAt: "2026-02-05",
    paidAt: "2026-02-13",
    workItems: [
      {
        id: "nv002-feb-1",
        name: "May than truoc",
        planCode: "#PP-021",
        productName: "Ao hoodie",
        quantity: 1520,
        unitPrice: 7500,
        total: 11400000,
      },
    ],
  },
  {
    employeeId: "nv003",
    employeeCode: "NV003",
    fullName: "Le Minh Cuong",
    avatarTone: "sky",
    team: "To may 2",
    month: "2026-02",
    grossIncome: 14200000,
    allowance: 600000,
    netIncome: 14800000,
    status: "paid",
    note: "Dat ke hoach va khong phat sinh sai hong.",
    createdAt: "2026-02-05",
    paidAt: "2026-02-12",
    workItems: [
      {
        id: "nv003-feb-1",
        name: "Rap than sau",
        planCode: "#PP-004",
        productName: "Ao khoac gio",
        quantity: 880,
        unitPrice: 6000,
        total: 5280000,
      },
      {
        id: "nv003-feb-2",
        name: "May tui hop",
        planCode: "#PP-011",
        productName: "Quan kaki",
        quantity: 1240,
        unitPrice: 4306,
        total: 5340000,
      },
      {
        id: "nv003-feb-3",
        name: "Can suon",
        planCode: "#PP-037",
        productName: "Ao gio",
        quantity: 960,
        unitPrice: 3730,
        total: 3580000,
      },
    ],
  },
  {
    employeeId: "nv004",
    employeeCode: "NV004",
    fullName: "Pham Thi Dung",
    avatarTone: "rose",
    team: "To may 2",
    month: "2026-02",
    grossIncome: 7100000,
    allowance: 300000,
    netIncome: 7400000,
    status: "paid",
    note: "Khong phat sinh dieu chinh trong ky.",
    createdAt: "2026-02-05",
    paidAt: "2026-02-12",
    workItems: [
      {
        id: "nv004-feb-1",
        name: "May co ao",
        planCode: "#PP-019",
        productName: "Ao so mi",
        quantity: 520,
        unitPrice: 4308,
        total: 2240000,
      },
      {
        id: "nv004-feb-2",
        name: "Tra nap tui",
        planCode: "#PP-025",
        productName: "Chan vay",
        quantity: 680,
        unitPrice: 2794,
        total: 1900000,
      },
      {
        id: "nv004-feb-3",
        name: "Len line hoan thien",
        planCode: "#PP-033",
        productName: "Ao phong",
        quantity: 1180,
        unitPrice: 2508,
        total: 2960000,
      },
    ],
  },
  {
    employeeId: "nv005",
    employeeCode: "NV005",
    fullName: "Hoang Quoc Viet",
    avatarTone: "violet",
    team: "To dong goi",
    month: "2026-02",
    grossIncome: 9800000,
    allowance: 600000,
    netIncome: 10400000,
    status: "paid",
    note: "Dong goi on dinh, khong tre chuyen.",
    createdAt: "2026-02-05",
    paidAt: "2026-02-11",
    workItems: [
      {
        id: "nv005-feb-1",
        name: "Gap thanh pham",
        planCode: "#PP-014",
        productName: "Ao thun basic",
        quantity: 2100,
        unitPrice: 2100,
        total: 4410000,
      },
      {
        id: "nv005-feb-2",
        name: "Dong goi carton",
        planCode: "#PP-014",
        productName: "Ao thun basic",
        quantity: 2000,
        unitPrice: 2695,
        total: 5390000,
      },
    ],
  },
  {
    employeeId: "nv006",
    employeeCode: "NV006",
    fullName: "Dang My Linh",
    avatarTone: "teal",
    team: "To cat",
    month: "2026-02",
    grossIncome: 8600000,
    allowance: 300000,
    netIncome: 8900000,
    status: "paid",
    note: "To cat hoan tat dung ke hoach.",
    createdAt: "2026-02-05",
    paidAt: "2026-02-12",
    workItems: [
      {
        id: "nv006-feb-1",
        name: "Cat than truoc",
        planCode: "#PP-022",
        productName: "Vay cong so",
        quantity: 840,
        unitPrice: 4700,
        total: 3948000,
      },
      {
        id: "nv006-feb-2",
        name: "Cat lot tui",
        planCode: "#PP-041",
        productName: "Quan short",
        quantity: 1380,
        unitPrice: 3386,
        total: 4672000,
      },
    ],
  },
  {
    employeeId: "nv007",
    employeeCode: "NV007",
    fullName: "Bui Xuan Tung",
    avatarTone: "slate",
    team: "To hoan thien",
    month: "2026-02",
    grossIncome: 9000000,
    allowance: 300000,
    netIncome: 9300000,
    status: "paid",
    note: "Chua phat sinh muc thuong chuyen can.",
    createdAt: "2026-02-05",
    paidAt: "2026-02-12",
    workItems: [
      {
        id: "nv007-feb-1",
        name: "Kiem loi cuoi chuyen",
        planCode: "#PP-007",
        productName: "Ao gio",
        quantity: 1160,
        unitPrice: 4181,
        total: 4850000,
      },
      {
        id: "nv007-feb-2",
        name: "La dinh hinh",
        planCode: "#PP-007",
        productName: "Ao gio",
        quantity: 1080,
        unitPrice: 3843,
        total: 4150000,
      },
    ],
  },
  {
    employeeId: "nv009",
    employeeCode: "NV009",
    fullName: "Tran Gia Bao",
    avatarTone: "cobalt",
    team: "To may 3",
    month: "2026-02",
    grossIncome: 8000000,
    allowance: 700000,
    netIncome: 8700000,
    status: "paid",
    note: "Da chuyen bo phan tu dau thang 3.",
    createdAt: "2026-02-05",
    paidAt: "2026-02-13",
    workItems: [
      {
        id: "nv009-feb-1",
        name: "May suon than",
        planCode: "#PP-044",
        productName: "Dam cong so",
        quantity: 760,
        unitPrice: 5000,
        total: 3800000,
      },
      {
        id: "nv009-feb-2",
        name: "May line tay",
        planCode: "#PP-044",
        productName: "Dam cong so",
        quantity: 740,
        unitPrice: 4054,
        total: 3000000,
      },
      {
        id: "nv009-feb-3",
        name: "Dinh khuy hoan thien",
        planCode: "#PP-048",
        productName: "Ao blouse",
        quantity: 1100,
        unitPrice: 1091,
        total: 1200000,
      },
    ],
  },
];

export const PAYROLL_PAGE_SIZE = 4;

function normalizeMonthValue(month) {
  if (!month) return "";
  const [year, rawMonth] = String(month).split("-");
  if (!year || !rawMonth) return "";

  return `${year}-${String(rawMonth).padStart(2, "0")}`;
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

export function getPayrollMonths() {
  return Array.from(new Set(PAYROLL_RECORDS.map((record) => record.month))).sort((a, b) => b.localeCompare(a));
}

export function getLatestPayrollMonth() {
  return getPayrollMonths()[0] ?? "";
}

export function getPreviousPayrollMonth(month) {
  const normalized = normalizeMonthValue(month);
  const months = getPayrollMonths();
  const index = months.indexOf(normalized);

  if (index === -1 || index === months.length - 1) {
    return "";
  }

  return months[index + 1];
}

export function getPayrollRecordsByMonth(month) {
  const normalized = normalizeMonthValue(month);

  return PAYROLL_RECORDS.filter((record) => record.month === normalized);
}

export function getPayrollRecord(employeeId, month) {
  const normalizedId = String(employeeId ?? "").toLowerCase();
  const normalizedMonth = normalizeMonthValue(month);

  return PAYROLL_RECORDS.find((record) => (
    record.employeeId === normalizedId && record.month === normalizedMonth
  )) ?? null;
}

export function getLatestPayrollRecordForEmployee(employeeId) {
  const normalizedId = String(employeeId ?? "").toLowerCase();

  return PAYROLL_RECORDS
    .filter((record) => record.employeeId === normalizedId)
    .sort((recordA, recordB) => recordB.month.localeCompare(recordA.month))[0] ?? null;
}

function sumBy(records, selector) {
  return records.reduce((total, record) => total + selector(record), 0);
}

export function getPayrollSummary(month) {
  const currentMonth = normalizeMonthValue(month);
  const previousMonth = getPreviousPayrollMonth(currentMonth);
  const currentRecords = getPayrollRecordsByMonth(currentMonth);
  const previousRecords = previousMonth ? getPayrollRecordsByMonth(previousMonth) : [];
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
    "To/bo phan",
    "So cong doan",
    "Tong thu nhap",
    "Phu cap",
    "Thuc linh",
    "Trang thai",
    "Ghi chu",
  ];

  const body = rows.map((record) => ([
    record.employeeCode,
    record.fullName,
    record.team,
    record.workItems.length,
    record.grossIncome,
    record.allowance,
    record.netIncome,
    record.status === "paid" ? "Da thanh toan" : "Cho xu ly",
    record.note,
  ]));

  const csvContent = [header, ...body]
    .map((line) => line.map(escapeCsvValue).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName || `bang-luong-${safeMonth}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
