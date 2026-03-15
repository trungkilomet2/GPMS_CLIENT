import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";
import WorkerService from "@/services/WorkerService";

const WORKER_ROLE_LABEL_MAP = {
  Tailor: "Thợ may",
  "Quality Control": "Kiểm tra chất lượng",
};

function getWorkerRoleLabel(name = "") {
  return WORKER_ROLE_LABEL_MAP[name] ?? name;
}

export function getWorkerRoleErrorMessage(error, fallbackMessage) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.message ||
    fallbackMessage
  );
}

function normalizeRole(item = {}, fallbackId = 0) {
  return {
    id: Number(item.id ?? item.wrId ?? item.workerRoleId ?? item.WR_ID ?? fallbackId),
    name: String(item.name ?? item.NAME ?? item.workerRoleName ?? "").trim(),
  };
}

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

function normalizeRoleCollection(response = {}) {
  const rawItems =
    response?.data ??
    response?.items ??
    response?.records ??
    response?.result ??
    [];

  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .map((item, index) => normalizeRole(item, index + 1))
    .filter((item) => item.id || item.name);
}

async function fetchWorkerRolePages(options = {}) {
  const pageSize = Number(options?.pageSize ?? 100);
  const sortColumn = options?.sortColumn ?? "Name";
  const sortOrder = options?.sortOrder ?? "ASC";
  const filterQuery = String(options?.filterQuery ?? "").trim();
  const collectedRoles = [];
  let pageIndex = Number(options?.pageIndex ?? 0);

  while (pageIndex < 50) {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.WORKER_ROLE.GET_ALL, {
      params: {
        PageIndex: pageIndex,
        PageSize: pageSize,
        SortColumn: sortColumn,
        SortOrder: sortOrder,
        ...(filterQuery ? { FilterQuery: filterQuery } : {}),
      },
    });
    const response = parseApiPayload(rawResponse);
    const items = normalizeRoleCollection(response);

    collectedRoles.push(...items);

    const recordCount = Number(
      response?.recordCount ??
      response?.totalCount ??
      response?.totalRecords ??
      response?.count
    );
    const loadedCount = (pageIndex - Number(options?.pageIndex ?? 0)) * pageSize + items.length;

    if (items.length === 0) break;
    if (Number.isFinite(recordCount) && recordCount > 0 && loadedCount >= recordCount) break;
    if (items.length < pageSize) break;

    pageIndex += 1;
  }

  return collectedRoles;
}

function mergeRoles(baseRoles, employeeRoles) {
  const merged = new Map();

  [...baseRoles, ...employeeRoles].forEach((role, index) => {
    if (!role?.name) return;

    const key = role.name.trim().toLowerCase();
    if (!key) return;

    if (!merged.has(key)) {
      merged.set(key, normalizeRole(role, index + 1));
    }
  });

  return Array.from(merged.values())
    .sort((a, b) => a.id - b.id)
    .map((item, index) => ({
      id: item.id || index + 1,
      name: item.name,
    }));
}

const WorkerRoleService = {
  async getWorkerRoles(options = {}) {
    const rolesFromApi = await fetchWorkerRolePages(options);

    let employees = [];
    try {
      const employeeResponse = await WorkerService.getAllEmployees();
      employees = employeeResponse?.data ?? [];
    } catch {
      employees = [];
    }

    const employeeRoles = employees
      .filter((employee) => employee.workerRole)
      .map((employee, index) => ({
        id: rolesFromApi.length + index + 1,
        name: employee.workerRole,
      }));

    const roles = mergeRoles(rolesFromApi, employeeRoles);

    return roles.map((role) => {
      const members = employees.filter((employee) => employee.workerRole === role.name);

      return {
        ...role,
        label: getWorkerRoleLabel(role.name),
        assignedCount: members.length,
        members: members.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          userName: member.userName,
        })),
      };
    });
  },

  async createWorkerRole(payload) {
    const name = String(payload?.name ?? "").trim();

    if (!name) {
      throw new Error("Tên vai trò thợ không được để trống.");
    }

    const roles = await fetchWorkerRolePages({ pageSize: 100 });
    const duplicate = roles.some((role) => role.name.toLowerCase() === name.toLowerCase());

    if (duplicate) {
      throw new Error("Vai trò thợ này đã tồn tại.");
    }

    const rawResponse = await axiosClient.post(API_ENDPOINTS.WORKER_ROLE.CREATE, { name });
    const response = parseApiPayload(rawResponse);
    const fallbackId = roles.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    const createdRole = normalizeRole(response?.data ?? response, fallbackId);
    const normalizedRole = {
      id: createdRole.id || fallbackId,
      name: createdRole.name || name,
    };

    return {
      ...normalizedRole,
      label: getWorkerRoleLabel(normalizedRole.name),
      assignedCount: 0,
      members: [],
    };
  },
};

export default WorkerRoleService;
