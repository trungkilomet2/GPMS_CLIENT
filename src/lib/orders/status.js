// Order status labels and styles
export const ORDER_STATUS_LABELS = {
  "Chờ xét duyệt": "Chờ Xét Duyệt",
  "Yêu cầu chỉnh sửa": "Yêu Cầu Chỉnh Sửa",
  "Đã chấp nhận": "Đã Chấp Nhận",
  "Đã từ chối": "Đã Từ Chối",
  "Đã hủy": "Đã Hủy",
};

const ORDER_STATUS_NORMALIZE_MAP = {
  "chờ xét duyệt": "Chờ xét duyệt",
  "cho xet duyet": "Chờ xét duyệt",
  pending: "Chờ xét duyệt",
  waiting: "Chờ xét duyệt",
  review: "Chờ xét duyệt",
  reviewing: "Chờ xét duyệt",
  processing: "Chờ xét duyệt",
  new: "Chờ xét duyệt",

  "yêu cầu chỉnh sửa": "Yêu cầu chỉnh sửa",
  "yeu cau chinh sua": "Yêu cầu chỉnh sửa",
  "cần cập nhật": "Yêu cầu chỉnh sửa",
  "can cap nhat": "Yêu cầu chỉnh sửa",
  "need update": "Yêu cầu chỉnh sửa",
  needupdate: "Yêu cầu chỉnh sửa",
  "need_update": "Yêu cầu chỉnh sửa",
  update_required: "Yêu cầu chỉnh sửa",
  revision: "Yêu cầu chỉnh sửa",
  revise: "Yêu cầu chỉnh sửa",
  editing: "Yêu cầu chỉnh sửa",

  "đã từ chối": "Đã từ chối",
  "da tu choi": "Đã từ chối",
  "từ chối": "Đã từ chối",
  "tu choi": "Đã từ chối",
  rejected: "Đã từ chối",
  reject: "Đã từ chối",
  denied: "Đã từ chối",
  deny: "Đã từ chối",

  "đã hủy": "Đã hủy",
  "da huy": "Đã hủy",
  cancelled: "Đã hủy",
  canceled: "Đã hủy",
  cancel: "Đã hủy",
  canceled_order: "Đã hủy",

  "đã chấp nhận": "Đã chấp nhận",
  "da chap nhan": "Đã chấp nhận",
  "chấp nhận": "Đã chấp nhận",
  "chap nhan": "Đã chấp nhận",
  approved: "Đã chấp nhận",
  approve: "Đã chấp nhận",
  accepted: "Đã chấp nhận",
  accept: "Đã chấp nhận",
  completed: "Đã chấp nhận",
  done: "Đã chấp nhận",
  success: "Đã chấp nhận",

  "đang sản xuất": "Đang sản xuất",
  "dang san xuat": "Đang sản xuất",
  "in production": "Đang sản xuất",
  production: "Đang sản xuất",
  "in progress": "Đang sản xuất",

  "đã hoàn thành": "Đã hoàn thành",
  "da hoan thanh": "Đã hoàn thành",
  "hoàn thành": "Đã hoàn thành",
  "hoan thanh": "Đã hoàn thành",
};

export function normalizeOrderStatus(status) {
  const normalized = String(status ?? "").normalize('NFC').trim().toLowerCase();
  if (!normalized) return "";

  if (normalized.includes('hoàn thành') || normalized.includes('hoan thanh') || normalized.includes('completed') || normalized.includes('success') || normalized.includes('done')) {
    return "Đã hoàn thành";
  }

  return ORDER_STATUS_NORMALIZE_MAP[normalized] || status;
}

export const ORDER_STATUS_STYLES_LIST = {
  "Chờ xét duyệt": "bg-amber-50 text-amber-700 border-amber-200",
  "Yêu cầu chỉnh sửa": "bg-blue-50 text-blue-700 border-blue-200",
  "Đã chấp nhận": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Đã từ chối": "bg-red-50 text-red-700 border-red-200",
  "Đã hủy": "bg-gray-50 text-gray-700 border-gray-200",
  "Đang sản xuất": "bg-purple-50 text-purple-700 border-purple-200",
  default: "bg-gray-50 text-gray-700 border-gray-200",
};

export const ORDER_STATUS_STYLES_DETAIL = {
  "Chờ xét duyệt": "bg-amber-100 text-amber-800 border border-amber-200",
  "Yêu cầu chỉnh sửa": "bg-blue-100 text-blue-800 border border-blue-200",
  "Đã từ chối": "bg-red-100 text-red-800 border border-red-200",
  "Đã hủy": "bg-gray-100 text-gray-700 border border-gray-200",
  "Đã chấp nhận": "bg-emerald-600 text-white",
  "Đang sản xuất": "bg-purple-600 text-white",
  "Đã hoàn thành": "bg-indigo-600 text-white",
  default: "bg-gray-100 text-gray-700",
};

const ORDER_STATUS_STYLES_LOWER = {
  list: {
    "chờ xét duyệt": ORDER_STATUS_STYLES_LIST["Chờ xét duyệt"],
    "yêu cầu chỉnh sửa": ORDER_STATUS_STYLES_LIST["Yêu cầu chỉnh sửa"],
    "đã chấp nhận": ORDER_STATUS_STYLES_LIST["Đã chấp nhận"],
    "đã từ chối": ORDER_STATUS_STYLES_LIST["Đã từ chối"],
    "đã hủy": ORDER_STATUS_STYLES_LIST["Đã hủy"],
    "đã hoàn thành": "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  detail: {
    "chờ xét duyệt": ORDER_STATUS_STYLES_DETAIL["Chờ xét duyệt"],
    "yêu cầu chỉnh sửa": ORDER_STATUS_STYLES_DETAIL["Yêu cầu chỉnh sửa"],
    "đã chấp nhận": ORDER_STATUS_STYLES_DETAIL["Đã chấp nhận"],
    "đã từ chối": ORDER_STATUS_STYLES_DETAIL["Đã từ chối"],
    "đã hủy": ORDER_STATUS_STYLES_DETAIL["Đã hủy"],
    "đã hoàn thành": ORDER_STATUS_STYLES_DETAIL["Đã hoàn thành"],
  },
};

export function getOrderStatusStyle(status, variant = 'list') {
  const normalized = normalizeOrderStatus(status);
  const variantKey = variant === 'detail' ? 'detail' : 'list';
  const styleMap = variantKey === 'detail' ? ORDER_STATUS_STYLES_DETAIL : ORDER_STATUS_STYLES_LIST;
  if (!normalized) return styleMap.default;
  return (
    styleMap[normalized] ||
    ORDER_STATUS_STYLES_LOWER[variantKey][normalized.toLowerCase()] ||
    styleMap.default
  );
}

export function getOrderStatusLabel(status) {
  const normalized = normalizeOrderStatus(status);
  if (!normalized) return "-";
  return ORDER_STATUS_LABELS[normalized] || normalized;
}
