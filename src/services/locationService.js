import provincesData from "@/data/vn-addresses.json";

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(tinh|thanh pho|tp|phuong|xa|thi tran|dac khu)\b/gi, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function mapProvince(item = {}) {
  return {
    code: String(item.Code || "").trim(),
    name: String(item.FullName || "").trim(),
  };
}

function mapWard(item = {}) {
  return {
    code: String(item.Code || "").trim(),
    name: String(item.FullName || "").trim(),
    provinceCode: String(item.ProvinceCode || "").trim(),
  };
}

const PROVINCES = Array.isArray(provincesData)
  ? provincesData.map(mapProvince).filter((item) => item.code && item.name)
  : [];

const WARDS_BY_PROVINCE = new Map(
  (Array.isArray(provincesData) ? provincesData : []).map((province) => [
    String(province.Code || "").trim(),
    Array.isArray(province.Wards)
      ? province.Wards.map(mapWard).filter((item) => item.code && item.name)
      : [],
  ]),
);

function findProvinceByText(value = "") {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return null;

  return (
    PROVINCES.find((item) => normalizeText(item.name) === normalizedValue) ||
    PROVINCES.find((item) => normalizeText(item.name).includes(normalizedValue)) ||
    PROVINCES.find((item) => normalizedValue.includes(normalizeText(item.name))) ||
    null
  );
}

function findWardByText(provinceCode, value = "") {
  const normalizedValue = normalizeText(value);
  if (!provinceCode || !normalizedValue) return null;

  const wards = WARDS_BY_PROVINCE.get(String(provinceCode).trim()) || [];
  return (
    wards.find((item) => normalizeText(item.name) === normalizedValue) ||
    wards.find((item) => normalizeText(item.name).includes(normalizedValue)) ||
    wards.find((item) => normalizedValue.includes(normalizeText(item.name))) ||
    null
  );
}

function parseStoredLocation(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return { provinceCode: "", wardCode: "", currentLabel: "" };

  const parts = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const provinceCandidate = parts.length ? parts[parts.length - 1] : raw;
  const province = findProvinceByText(provinceCandidate) || findProvinceByText(raw);

  if (!province) {
    return { provinceCode: "", wardCode: "", currentLabel: raw };
  }

  const wardSourceParts = parts.slice(0, -1);
  const wardCandidate = wardSourceParts[0] || raw;
  const ward =
    findWardByText(province.code, wardCandidate) ||
    wardSourceParts.map((item) => findWardByText(province.code, item)).find(Boolean) ||
    findWardByText(province.code, raw);

  return {
    provinceCode: province.code,
    wardCode: ward?.code || "",
    currentLabel: raw,
  };
}

function formatLocation(wardName = "", provinceName = "") {
  const ward = String(wardName || "").trim();
  const province = String(provinceName || "").trim();
  if (!ward && !province) return "";
  if (!ward) return province;
  if (!province) return ward;
  return `${ward}, ${province}`;
}

export const locationService = {
  async getProvinces() {
    return PROVINCES;
  },

  async getWardsByProvinceCode(provinceCode) {
    if (!provinceCode) return [];
    return WARDS_BY_PROVINCE.get(String(provinceCode).trim()) || [];
  },

  parseStoredLocation,
  formatLocation,
};

