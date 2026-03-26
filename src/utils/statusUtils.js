export const STATUS_STYLES = {
  "Cần Cập Nhật": "bg-slate-50 text-slate-700 border-slate-200",
  "Cần Chỉnh Sửa Kế Hoạch": "bg-orange-50 text-orange-700 border-orange-200",
  "Chấp Nhận": "bg-teal-50 text-teal-700 border-teal-200",
  "Chờ kiểm tra": "bg-sky-50 text-sky-700 border-sky-200",
  "Chờ Xét Duyệt": "bg-sky-50 text-sky-700 border-sky-200", // Fallback
  "Chờ Xét Duyệt Kế Hoạch": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Đang Sản Xuất": "bg-violet-50 text-violet-700 border-violet-200",
  "Hoàn Thành": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Từ Chối": "bg-rose-50 text-rose-700 border-rose-200",
  default: "bg-gray-50 text-gray-700 border-gray-200",
};

// Mapping theo bảng PS_STATUS trong DB (PS_ID → NAME)
const PRODUCTION_STATUS_BY_ID = {
  1: "Chờ Xét Duyệt",            // PS_ID=1 
  2: "Từ Chối",                  // PS_ID=2
  3: "Chấp Nhận",                // PS_ID=3
  4: "Chờ Xét Duyệt Kế Hoạch",  // PS_ID=4
  5: "Cần Chỉnh Sửa Kế Hoạch",  // PS_ID=5
  6: "Đang Sản Xuất",            // PS_ID=6
  7: "Hoàn Thành",               // PS_ID=7
};

export function getProductionStatusLabel(status) {
  if (typeof status === "number" && PRODUCTION_STATUS_BY_ID[status]) {
    return PRODUCTION_STATUS_BY_ID[status];
  }

  let raw = String(status ?? "").trim();
  if (raw.normalize) {
    raw = raw.normalize("NFC");
  }
  if (!raw) return "-";

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && PRODUCTION_STATUS_BY_ID[numeric]) {
    return PRODUCTION_STATUS_BY_ID[numeric];
  }

  const normalized = raw.toLowerCase();

  // Substring fallback để tránh Unicode encoding mismatch
  if (normalized.includes("ki\u1ec3m tra")) return "Ch\u1edd ki\u1ec3m tra";
  if (normalized.includes("kế hoạch") || normalized.includes("k\u1ebf ho\u1ea1ch")) {
    if (normalized.includes("xét duyệt") || normalized.includes("x\u00e9t duy\u1ec7t")) return "Ch\u1edd X\u00e9t Duy\u1ec7t K\u1ebf Ho\u1ea1ch";
    if (normalized.includes("chỉnh sửa") || normalized.includes("ch\u1ec9nh s\u1eeda")) return "C\u1ea7n Ch\u1ec9nh S\u1eeda K\u1ebf Ho\u1ea1ch";
    return "Ch\u1edd X\u00e9t Duy\u1ec7t K\u1ebf Ho\u1ea1ch"; // Default plan status
  }
  if (normalized.includes("đang sản xuất") || normalized.includes("\u0111ang s\u1ea3n xu\u1ea5t")) return "\u0110ang S\u1ea3n Xu\u1ea5t";
  if (normalized.includes("hoàn thành") || normalized.includes("ho\u00e0n th\u00e0nh")) return "Ho\u00e0n Th\u00e0nh";
  if (normalized.includes("từ chối") || normalized.includes("t\u1eeb ch\u1ed1i")) return "T\u1eeb Ch\u1ed1i";
  if (normalized.includes("chấp nhận") || normalized.includes("ch\u1ea5p nh\u1eadn")) return "Ch\u1ea5p Nh\u1eadn";
  if (normalized.includes("chờ xét duyệt") || normalized.includes("ch\u1edd x\u00e9t duy\u1ec7t")) return "Ch\u1edd ki\u1ec3m tra";

  return raw;
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

  let raw = String(status ?? "").trim();
  if (raw.normalize) {
    raw = raw.normalize("NFC");
  }
  if (!raw) return "-";

  const normalized = raw.toLowerCase();
  return PLAN_LABELS[normalized] || raw;
}
