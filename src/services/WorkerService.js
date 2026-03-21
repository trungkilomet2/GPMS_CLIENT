import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";
import {
  getManagerRoleHint,
  getRoleHierarchyTag,
  getSystemRoleLabel,
  getWorkerSkillLabel,
  pickPrimarySystemRole,
  splitRoles,
} from "@/lib/orgHierarchy";

export const getEmployeeModuleErrorMessage = (error, fallbackMessage) => {
  if (error?.response?.status === 403) {
    return "Bạn không có quyền truy cập chức năng này.";
  }

  const data = error?.response?.data ?? {};
  const fieldErrors =
    data?.errors && typeof data.errors === "object"
      ? Object.entries(data.errors).flatMap(([, messages]) =>
          (Array.isArray(messages) ? messages : [messages]).map((message) => String(message))
        )
      : [];

  return fieldErrors[0] || data?.message || data?.title || data?.detail || fallbackMessage;
};

const parseApiPayload = (rawResponse) =>
  typeof rawResponse === "string"
    ? (() => {
        // Some endpoints return `text/plain` even on success.
        // Don't throw on JSON parse failures; treat the string as a successful payload.
        try {
          return JSON.parse(rawResponse);
        } catch {
          return { data: rawResponse };
        }
      })()
    : rawResponse ?? {};

const normalizeEmployeeStatus = (value, statusId) => {
  const normalizedStatusId = Number(statusId);

  if (Number.isFinite(normalizedStatusId)) {
    if (normalizedStatusId === 1) return "active";
    if (normalizedStatusId === 2) return "inactive";
  }

  const normalized = String(value ?? "inactive").trim().toLowerCase();

  if (["1", "active", "working", "enabled"].includes(normalized)) return "active";
  return "inactive";
};

const HIDDEN_DIRECTORY_ROLES = ["Admin", "Customer"];

const shouldHideFromEmployeeDirectory = (employee = {}) => {
  const roles = Array.isArray(employee.roles) ? employee.roles : [];
  return roles.some((role) => HIDDEN_DIRECTORY_ROLES.includes(role));
};

const normalizeEmployee = (item = {}) => {
  const workerRole = String(item.workerRole ?? item.workerSkill ?? "").trim();
  const roleSource = item.role ?? item.roles ?? item.roleName ?? "";
  const role = Array.isArray(roleSource)
    ? roleSource.map((entry) => String(entry).trim()).filter(Boolean).join(", ")
    : String(roleSource ?? "").trim();
  const roles = splitRoles(role);
  const primarySystemRole = pickPrimarySystemRole(role);

  return {
    id: item.id ?? null,
    userName: item.userName ?? "",
    fullName: item.fullName ?? item.userFullName ?? "Chưa cập nhật",
    phoneNumber: item.phoneNumber ?? "",
    avatarUrl: item.avatarUrl ?? item.avartarUrl ?? "",
    location: item.location ?? "",
    email: item.email ?? "",
    role,
    roles,
    roleLabels: roles.map(getSystemRoleLabel),
    workerRole,
    workerRoleLabel: workerRole ? getWorkerSkillLabel(workerRole) : "",
    workerSkill: workerRole,
    workerSkillLabel: workerRole ? getWorkerSkillLabel(workerRole) : "",
    primaryRole: primarySystemRole || workerRole || "Chưa cập nhật",
    primaryRoleLabel: primarySystemRole
      ? getSystemRoleLabel(primarySystemRole)
      : workerRole
        ? getWorkerSkillLabel(workerRole)
        : "Chưa cập nhật",
    primarySystemRole,
    primarySystemRoleLabel: primarySystemRole ? getSystemRoleLabel(primarySystemRole) : "Chưa cập nhật",
    hierarchyTag: getRoleHierarchyTag(primarySystemRole),
    managerRoleHint: getManagerRoleHint(primarySystemRole),
    statusId: item.statusId ?? null,
    status: normalizeEmployeeStatus(
      item.status ?? item.accountStatus ?? item.userStatus,
      item.statusId
    ),
  };
};

const normalizeEmployeeCollection = (response = {}) => {
  const rawItems = response?.data ?? response?.items ?? response?.records ?? [];

  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map(normalizeEmployee)
    .filter((employee) => !shouldHideFromEmployeeDirectory(employee));
};

const normalizeEmployeeResponse = (response = {}) => {
  if (!response?.data || Array.isArray(response.data)) {
    return response;
  }

  return {
    ...response,
    data: normalizeEmployee(response.data),
  };
};

async function fetchEmployeeByWorkerId(id) {
  const rawResponse = await axiosClient.get(API_ENDPOINTS.WORKER.GET_BY_ID(id));
  const response = parseApiPayload(rawResponse);

  if (!response?.data) return null;

  const employee = normalizeEmployee(response.data);
  return shouldHideFromEmployeeDirectory(employee) ? null : employee;
}

const WorkerService = {
  async getAllEmployees() {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.WORKER.GET_ALL_EMPLOYEES);
    const response = parseApiPayload(rawResponse);
    const employees = normalizeEmployeeCollection(response);

    return {
      ...response,
      data: employees,
    };
  },

  async getEmployeeById(id) {
    return fetchEmployeeByWorkerId(id);
  },

  async createEmployee(payload) {
    const rawResponse = await axiosClient.post(API_ENDPOINTS.WORKER.CREATE, payload);
    return normalizeEmployeeResponse(parseApiPayload(rawResponse));
  },

  async updateEmployee(id, payload) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.WORKER.UPDATE(id), payload);
    return parseApiPayload(rawResponse);
  },
};

export default WorkerService;
