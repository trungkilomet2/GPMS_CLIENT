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
};

export default LogService;
