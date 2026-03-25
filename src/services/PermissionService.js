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

const PermissionService = {
  async getPermissions() {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.PERMISSION.GET_ALL);
    const response = parseApiPayload(rawResponse);
    const data = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];

    return {
      ...response,
      data,
    };
  },

  async updatePermission(id, roleAuthorize) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.PERMISSION.UPDATE(id), {
      roleAuthorize: String(roleAuthorize ?? ""),
    });

    return parseApiPayload(rawResponse);
  },
};

export default PermissionService;
