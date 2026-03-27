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

export function getPermissionErrorMessage(error, fallbackMessage) {
  if (error?.response?.status === 401) {
    return "Phiên đăng nhập đã hết hạn hoặc tài khoản hiện không có quyền đọc permission.";
  }

  if (error?.response?.status === 403) {
    return "Tài khoản hiện không được phép truy cập dữ liệu permission.";
  }

  if (error?.response?.status === 404) {
    return "Backend chưa mở endpoint permission/role/audit theo contract hiện tại.";
  }

  return error?.response?.data?.detail || error?.response?.data?.message || fallbackMessage;
}

function uniqueById(items = []) {
  const seen = new Map();

  items.forEach((item) => {
    const key = item?.id ?? `${item?.controller}-${item?.action}-${item?.method}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  });

  return Array.from(seen.values());
}

function normalizeRole(item = {}) {
  return {
    id: Number(item.id ?? item.roleId ?? 0) || null,
    name: String(item.name ?? item.key ?? item.label ?? "").trim(),
  };
}

function normalizePermission(item = {}) {
  const roles = Array.isArray(item.roles) ? item.roles.map(normalizeRole).filter((role) => role.id && role.name) : [];

  return {
    id: Number(item.id ?? 0) || null,
    controller: String(item.controller ?? "").trim(),
    method: String(item.method ?? "").trim().toUpperCase(),
    action: String(item.action ?? "").trim(),
    roles,
  };
}

function normalizeAuditItem(item = {}) {
  return {
    id: item.id ?? item.auditId ?? null,
    permissionId: item.permissionId ?? item.permission?.id ?? null,
    controller: String(item.controller ?? item.permission?.controller ?? "").trim(),
    method: String(item.method ?? item.permission?.method ?? "").trim().toUpperCase(),
    action: String(item.action ?? item.permission?.action ?? "").trim(),
    actor: String(item.actor ?? item.userName ?? item.createdBy ?? "").trim(),
    changedAt: item.changedAt ?? item.createdAt ?? item.timestamp ?? "",
    roles: Array.isArray(item.roles) ? item.roles.map(normalizeRole).filter((role) => role.id && role.name) : [],
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
      data: uniqueById(data.map(normalizePermission).filter((item) => item.id)),
    };
  },

  async updatePermission(id, roleIds = []) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.PERMISSION.UPDATE(id), {
      roleIds: Array.isArray(roleIds) ? roleIds.map(Number).filter(Number.isFinite) : [],
    });

    return parseApiPayload(rawResponse);
  },

  async getAuditLogs(params = {}) {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.PERMISSION.AUDIT, {
      params: {
        ...(params.PageIndex != null ? { PageIndex: params.PageIndex } : {}),
        ...(params.PageSize != null ? { PageSize: params.PageSize } : {}),
        ...(params.FilterQuery ? { FilterQuery: params.FilterQuery } : {}),
        ...(params.fromTimestamp ? { fromTimestamp: params.fromTimestamp } : {}),
        ...(params.toTimestamp ? { toTimestamp: params.toTimestamp } : {}),
      },
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

  async getRoles() {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.PERMISSION.ROLE_LIST);
    const response = parseApiPayload(rawResponse);
    const data = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];

    return {
      ...response,
      data: uniqueById(data.map(normalizeRole).filter((item) => item.id && item.name)),
    };
  },
};

export default PermissionService;
