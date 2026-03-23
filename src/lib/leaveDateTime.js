function coerceToDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.includes(" ")
    ? raw.replace(" ", "T")
    : raw;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeLeaveDate(value) {
  const date = coerceToDate(value);
  return date ? date.toISOString() : null;
}

export function formatLeaveDateTime(value, emptyLabel = "Chưa cập nhật") {
  const date = coerceToDate(value);
  if (!date) return emptyLabel;

  return `${date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} ${date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function compareLeaveDateDesc(left, right) {
  const leftTime = coerceToDate(left)?.getTime() ?? 0;
  const rightTime = coerceToDate(right)?.getTime() ?? 0;
  return rightTime - leftTime;
}
