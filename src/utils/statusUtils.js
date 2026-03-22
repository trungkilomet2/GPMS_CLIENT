export const STATUS_STYLES = {
  "Cần Cập Nhật": "bg-amber-50 text-amber-700 border-amber-200",
  "Cần Chỉnh Sửa Kế Hoạch": "bg-amber-50 text-amber-700 border-amber-200",
  "Chấp Nhận": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Chờ Xét Duyệt": "bg-blue-50 text-blue-700 border-blue-200",
  "Chờ Xét Duyệt Kế Hoạch": "bg-blue-50 text-blue-700 border-blue-200",
  "Đang Sản Xuất": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Hoàn Thành": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Từ Chối": "bg-red-50 text-red-700 border-red-200",
  Planned: "bg-amber-50 text-amber-700 border-amber-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  default: "bg-gray-50 text-gray-700 border-gray-200",
};

const PRODUCTION_LABELS = {
  "cần cập nhật": "Cần Cập Nhật",
  "can cap nhat": "Cần Cập Nhật",
  "need update": "Cần Cập Nhật",
  "update required": "Cần Cập Nhật",
  "cần chỉnh sửa kế hoạch": "Cần Chỉnh Sửa Kế Hoạch",
  "can chinh sua ke hoach": "Cần Chỉnh Sửa Kế Hoạch",
  "need plan update": "Cần Chỉnh Sửa Kế Hoạch",
  "chấp nhận": "Chấp Nhận",
  "chap nhan": "Chấp Nhận",
  approved: "Chấp Nhận",
  accepted: "Chấp Nhận",
  "chờ xét duyệt": "Chờ Xét Duyệt",
  "cho xet duyet": "Chờ Xét Duyệt",
  pending: "Chờ Xét Duyệt",
  waiting: "Chờ Xét Duyệt",
  "chờ xét duyệt kế hoạch": "Chờ Xét Duyệt Kế Hoạch",
  "cho xet duyet ke hoach": "Chờ Xét Duyệt Kế Hoạch",
  planned: "Chờ Xét Duyệt Kế Hoạch",
  "đang sản xuất": "Đang Sản Xuất",
  "dang san xuat": "Đang Sản Xuất",
  "in progress": "Đang Sản Xuất",
  production: "Đang Sản Xuất",
  "hoàn thành": "Hoàn Thành",
  "hoan thanh": "Hoàn Thành",
  completed: "Hoàn Thành",
  done: "Hoàn Thành",
  "từ chối": "Từ Chối",
  "tu choi": "Từ Chối",
  rejected: "Từ Chối",
  deny: "Từ Chối",
  denied: "Từ Chối",
};

export function getProductionStatusLabel(status) {
  const raw = String(status ?? "").trim();
  if (!raw) return "-";
  const normalized = raw.toLowerCase();
  return PRODUCTION_LABELS[normalized] || raw;
}

const PLAN_LABELS = {
  "chờ xét duyệt kế hoạch": "Planned",
  "cho xet duyet ke hoach": "Planned",
  planned: "Planned",
  "chờ xét duyệt": "Planned",
  "cho xet duyet": "Planned",
  pending: "Planned",
  "đang sản xuất": "In Progress",
  "dang san xuat": "In Progress",
  "in progress": "In Progress",
  "hoàn thành": "Completed",
  "hoan thanh": "Completed",
  completed: "Completed",
  done: "Completed",
};

export function getPlanStatusLabel(status) {
  if (typeof status === "number") {
    if (status === 1) return "Planned";
    if (status === 2) return "In Progress";
    if (status === 3) return "Completed";
  }

  const raw = String(status ?? "").trim();
  if (!raw) return "-";
  const normalized = raw.toLowerCase();
  return PLAN_LABELS[normalized] || raw;
}
