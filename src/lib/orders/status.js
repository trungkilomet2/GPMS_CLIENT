// Order status labels and styles
export const ORDER_STATUS_LABELS = {
  "Chờ xét duyệt": "Chờ xét duyệt",
  "Cần cập nhật": "Cần cập nhật",
  "Từ chối": "Từ chối",
  "Chấp nhận": "Chấp nhận",
};

export const ORDER_STATUS_STYLES_LIST = {
  "Chờ xét duyệt": "bg-amber-50 text-amber-700 border-amber-200",
  "Cần cập nhật": "bg-blue-50 text-blue-700 border-blue-200",
  "Từ chối": "bg-red-50 text-red-700 border-red-200",
  "Chấp nhận": "bg-emerald-50 text-emerald-700 border-emerald-200",
  default: "bg-gray-50 text-gray-700 border-gray-200",
};

export const ORDER_STATUS_STYLES_DETAIL = {
  "Chờ xét duyệt": "bg-amber-100 text-amber-800 border border-amber-200",
  "Cần cập nhật": "bg-blue-100 text-blue-800 border border-blue-200",
  "Từ chối": "bg-red-100 text-red-800 border border-red-200",
  "Chấp nhận": "bg-emerald-600 text-white",
  default: "bg-gray-100 text-gray-700",
};

const ORDER_STATUS_STYLES_LOWER = {
  list: {
    "chờ xét duyệt": ORDER_STATUS_STYLES_LIST["Chờ xét duyệt"],
    "cần cập nhật": ORDER_STATUS_STYLES_LIST["Cần cập nhật"],
    "từ chối": ORDER_STATUS_STYLES_LIST["Từ chối"],
    "chấp nhận": ORDER_STATUS_STYLES_LIST["Chấp nhận"],
  },
  detail: {
    "chờ xét duyệt": ORDER_STATUS_STYLES_DETAIL["Chờ xét duyệt"],
    "cần cập nhật": ORDER_STATUS_STYLES_DETAIL["Cần cập nhật"],
    "từ chối": ORDER_STATUS_STYLES_DETAIL["Từ chối"],
    "chấp nhận": ORDER_STATUS_STYLES_DETAIL["Chấp nhận"],
  },
};

export function getOrderStatusStyle(status, variant = 'list') {
  const normalized = String(status ?? "").trim();
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
  const normalized = String(status ?? "").trim();
  if (!normalized) return "-";
  return ORDER_STATUS_LABELS[normalized] || normalized;
}
