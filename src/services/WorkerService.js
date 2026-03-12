import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const normalizeEmployeeStatus = (value) => {
  const normalized = String(value ?? "inactive").trim().toLowerCase();

  if (["active", "working", "enabled"].includes(normalized)) return "active";
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

const splitRoles = (value = "") =>
  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

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

const normalizeEmployee = (item = {}) => {
  const workerRole = String(item.workerRole ?? "").trim();
  const role = String(item.role ?? "").trim();
  const roles = splitRoles(role);

  return {
    id: item.id ?? null,
    userName: item.userName ?? "",
    fullName: item.fullName ?? item.userFullName ?? "Chưa cập nhật",
    phoneNumber: item.phoneNumber ?? "",
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
    status: normalizeEmployeeStatus(item.status),
  };
};

const WorkerService = {
  async getAllEmployees() {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.WORKER.GET_ALL_EMPLOYEES);
    const response =
      typeof rawResponse === "string"
        ? JSON.parse(rawResponse)
        : rawResponse;

    const rawItems = response?.data ?? response?.items ?? response?.records ?? [];

    return {
      ...response,
      data: Array.isArray(rawItems) ? rawItems.map(normalizeEmployee) : [],
    };
  },

  async getEmployeeById(id) {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.WORKER.GET_BY_ID(id));
    const response =
      typeof rawResponse === "string"
        ? JSON.parse(rawResponse)
        : rawResponse;

    return response?.data ? normalizeEmployee(response.data) : null;
  },

  async createEmployee(payload) {
    const rawResponse = await axiosClient.post(API_ENDPOINTS.WORKER.CREATE, payload);
    const response =
      typeof rawResponse === "string"
        ? JSON.parse(rawResponse)
        : rawResponse;

    return response;
  },

  async updateEmployee(id, payload) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.WORKER.UPDATE(id), payload);
    const response =
      typeof rawResponse === "string"
        ? JSON.parse(rawResponse)
        : rawResponse;

    return response;
  },
};

export default WorkerService;
