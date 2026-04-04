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

function normalizePermissionItem(item = {}) {
  const roles = Array.isArray(item.roles) ? item.roles : [];

  return {
    id: Number(item.id ?? 0),
    controller: String(item.controller ?? "").trim(),
    method: String(item.method ?? "").trim().toUpperCase(),
    action: String(item.action ?? "").trim(),
    roles: roles.map((role) => ({
      id: Number(role?.id ?? 0),
      name: String(role?.name ?? "").trim(),
    })),
    roleIds: roles
      .map((role) => Number(role?.id ?? 0))
      .filter((roleId) => Number.isFinite(roleId) && roleId > 0),
  };
}

function normalizeAuditItem(item = {}) {
  return {
    id: Number(item.id ?? 0),
    message: String(item.message ?? "").trim(),
    messageTemplate: String(item.messageTemplate ?? "").trim(),
    level: String(item.level ?? "").trim(),
    timestamp: item.timeStemp || item.timestamp || null,
    exception: String(item.exception ?? "").trim(),
    properties: String(item.properties ?? "").trim(),
  };
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
      data: data.map(normalizePermissionItem),
    };
  },

  async updatePermission(id, roleIds = []) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.PERMISSION.UPDATE(id), {
      roleIds: Array.from(
        new Set(
          (Array.isArray(roleIds) ? roleIds : [])
            .map((roleId) => Number(roleId))
            .filter((roleId) => Number.isFinite(roleId) && roleId > 0)
        )
      ),
    });

    return parseApiPayload(rawResponse);
  },

  async getPermissionAudit(params = {}) {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.PERMISSION.AUDIT, {
      params,
    });
    const response = parseApiPayload(rawResponse);
    const data = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];

    return {
      ...response,
      data: data.map(normalizeAuditItem),
    };
  },
};

export default PermissionService;
