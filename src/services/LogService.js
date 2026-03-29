import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

function parseApiPayload(rawResponse) {
  if (typeof rawResponse !== "string") {
    return rawResponse ?? {};
  }

  try {
    return JSON.parse(rawResponse);
  } catch {
    return {};
  }
}

const LogService = {
  async getAll(params = {}) {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.LOG.GET_ALL, { params });
    return parseApiPayload(rawResponse);
  },

  async getAllPages(options = {}) {
    const pageSize = Number(options?.pageSize ?? 100);
    const startPageIndex = Number(options?.pageIndex ?? 0);
    const sortColumn = options?.sortColumn ?? "Name";
    const sortOrder = options?.sortOrder ?? "DESC";
    const pages = [];
    let pageIndex = startPageIndex;

    while (pageIndex < startPageIndex + 50) {
      const response = await this.getAll({
        PageIndex: pageIndex,
        PageSize: pageSize,
        SortColumn: sortColumn,
        SortOrder: sortOrder,
      });

      const items = Array.isArray(response?.data) ? response.data : [];
      const recordCount = Number(
        response?.recordCount ??
        response?.totalCount ??
        response?.totalRecords ??
        response?.count
      );

      pages.push(...items);

      if (items.length === 0) break;

      const loadedCount = (pageIndex - startPageIndex) * pageSize + items.length;
      if (Number.isFinite(recordCount) && loadedCount >= recordCount) break;
      if (items.length < pageSize) break;

      pageIndex += 1;
    }

    return {
      data: pages,
      recordCount: pages.length,
    };
  },
};

export default LogService;
