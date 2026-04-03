const PROVINCES_API_BASE = "https://provinces.open-api.vn/api/v2";

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    throw new Error("Không thể tải dữ liệu địa chỉ.");
  }
  return data;
}

function normalizeOption(item = {}) {
  return {
    code: item.code,
    name: String(item.name || "").trim(),
    divisionType: String(item.division_type || "").trim(),
    provinceCode: item.province_code ?? null,
  };
}

export const locationService = {
  async getProvinces() {
    const res = await fetch(`${PROVINCES_API_BASE}/p/`);
    const data = await parseJsonResponse(res);
    return Array.isArray(data)
      ? data.map(normalizeOption).filter((item) => item.code != null && item.name)
      : [];
  },

  async getWardsByProvinceCode(provinceCode) {
    if (!provinceCode) return [];

    const res = await fetch(`${PROVINCES_API_BASE}/p/${provinceCode}?depth=2`);
    const data = await parseJsonResponse(res);
    const wards = Array.isArray(data?.wards) ? data.wards : [];

    return wards
      .map(normalizeOption)
      .filter((item) => item.code != null && item.name);
  },
};

