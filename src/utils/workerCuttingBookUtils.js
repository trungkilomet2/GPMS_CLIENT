export const DEFAULT_RECORD = {
  color: "",
  meterPerKg: "",
  layer: "",
  productQty: "",
  avgConsumption: "",
  dateCreate: "",
  note: "",
};

export const DEFAULT_META = {
  productionId: "",
  markerLength: "",
  fabricWidth: "",
  productionName: "",
};

export const getProductionId = (item) => item?.productionId ?? item?.id ?? "";
export const getProductionName = (item) =>
  item?.order?.orderName || item?.orderName || item?.name || "";

export const hasValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

export const extractDataList = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

export const mapNotebookLogToRecord = (log) => ({
  id: log?.id ?? Date.now().toString(36),
  color: log?.color ?? "",
  meterPerKg: hasValue(log?.meterPerKg) ? String(log.meterPerKg) : "",
  layer: hasValue(log?.layer) ? String(log.layer) : "",
  productQty: hasValue(log?.productQty) ? String(log.productQty) : "",
  avgConsumption: hasValue(log?.avgConsumption) ? String(log.avgConsumption) : "",
  dateCreate: log?.dateCreate || "",
  note: log?.note || "",
});

export const calcTotalLayers = (records) =>
  records.reduce((sum, item) => sum + (Number(item.layer) || 0), 0);

export const getTodayString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
