import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

export const getEmployeeModuleErrorMessage = (error, fallbackMessage) => {
  if (error?.response?.status === 403) {
    return "Bạn không có quyền truy cập chức năng này.";
  }

  return error?.response?.data?.message || error?.response?.data?.title || fallbackMessage;
};

const parseApiPayload = (rawResponse) =>
  typeof rawResponse === "string"
    ? JSON.parse(rawResponse)
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

const INTERNAL_ROLE_PRIORITY = [
  "Owner",
  "PM",
  "Team Leader",
  "KCS",
  "Worker",
  "Admin",
  "Customer",
];

const HIDDEN_DIRECTORY_ROLES = ["Admin", "Customer"];

const ROLE_LABEL_MAP = {
  Admin: "Quản trị viên",
  Customer: "Khách hàng",
  Owner: "Chủ xưởng",
  PM: "Quản lý sản xuất",
  "Team Leader": "Tổ trưởng",
  Worker: "Nhân viên",
  KCS: "Kiểm soát chất lượng",
};

const WORKER_ROLE_LABEL_MAP = {
  Tailor: "Thợ may",
  "Quality Control": "Kiểm tra chất lượng",
};

const splitRoles = (value = "") => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const pickPrimaryRole = (roleValue, workerRoleValue) => {
  if (workerRoleValue) return workerRoleValue;

  const roles = splitRoles(roleValue);
  for (const role of INTERNAL_ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }

  return roles[0] ?? "Chưa cập nhật";
};

const getRoleLabel = (role) => ROLE_LABEL_MAP[role] ?? role;

const getWorkerRoleLabel = (role) => WORKER_ROLE_LABEL_MAP[role] ?? role;

const shouldHideFromEmployeeDirectory = (employee = {}) => {
  const roles = Array.isArray(employee.roles) ? employee.roles : [];
  return roles.some((role) => HIDDEN_DIRECTORY_ROLES.includes(role));
};

const normalizeEmployee = (item = {}) => {
  const workerRole = String(item.workerRole ?? "").trim();
  const roleSource = item.role ?? item.roles ?? item.roleName ?? "";
  const role = Array.isArray(roleSource)
    ? roleSource.map((entry) => String(entry).trim()).filter(Boolean).join(", ")
    : String(roleSource ?? "").trim();
  const roles = splitRoles(role);

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
    roleLabels: roles.map(getRoleLabel),
    workerRole,
    workerRoleLabel: workerRole ? getWorkerRoleLabel(workerRole) : "",
    primaryRole: pickPrimaryRole(role, workerRole),
    primaryRoleLabel: workerRole
      ? getWorkerRoleLabel(workerRole)
      : getRoleLabel(pickPrimaryRole(role, workerRole)),
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
