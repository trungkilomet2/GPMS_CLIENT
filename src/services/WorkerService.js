import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";
import { getAuthItem, getStoredUser } from "@/lib/authStorage";
import {
  getAllowedManagerRoles,
  getManagerRoleHint,
  getRoleHierarchyTag,
  getSystemRoleLabel,
  getWorkerSkillLabel,
  pickPrimarySystemRole,
  splitRoles,
} from "@/lib/orgHierarchy";
import { getErrorMessage } from "@/utils/errorUtils";

export const getEmployeeModuleErrorMessage = getErrorMessage;

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

const unique = (values = []) => Array.from(new Set(values.filter(Boolean)));

const extractNamesFromCollection = (collection = []) => {
  if (!Array.isArray(collection)) return [];

  return unique(
    collection
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string" || typeof item === "number") return String(item).trim();
        if (typeof item === "object") {
          return String(
            item.name ??
            item.role ??
            item.roleName ??
            item.skillName ??
            item.workerSkillName ??
            item.label ??
            item.value ??
            ""
          ).trim();
        }
        return "";
      })
      .filter(Boolean)
  );
};

const shouldHideFromEmployeeDirectory = (employee = {}) => {
  const roles = Array.isArray(employee.roles) ? employee.roles : [];
  return roles.some((role) => HIDDEN_DIRECTORY_ROLES.includes(role));
};

const normalizeEmployee = (item = {}) => {
  const roles = splitRoles(item.role ?? item.roles ?? item.roleName ?? item.roleNames ?? "");
  const role = roles.join(", ");
  const workerSkillNames = unique([
    ...extractNamesFromCollection(item.workerSkills),
    ...extractNamesFromCollection(item.workerRoles),
    ...splitRoles(item.workerSkill),
    ...splitRoles(item.workerRole),
  ]);
  const workerRole = workerSkillNames[0] ?? "";
  const primarySystemRole = pickPrimarySystemRole(role);
  const managerRoles = getAllowedManagerRoles(primarySystemRole);
  const managerIdRaw = item.managerId ?? item.manager?.id ?? item.parentId ?? null;
  const parsedManagerId = Number(managerIdRaw);
  const managerId =
    managerIdRaw === null ||
    managerIdRaw === undefined ||
    managerIdRaw === "" ||
    !Number.isFinite(parsedManagerId) ||
    parsedManagerId <= 0
      ? null
      : parsedManagerId;
  const managerName = String(
    item.managerName ??
    item.manager?.fullName ??
    item.manager?.name ??
    item.parentName ??
    ""
  ).trim();

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
    workerSkillNames,
    workerSkillLabels: workerSkillNames.map(getWorkerSkillLabel),
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
    managerId,
    managerName,
    allowedManagerRoles: managerRoles,
    statusId: item.statusId ?? item.status?.id ?? null,
    status: normalizeEmployeeStatus(
      item.status?.name ?? item.status ?? item.accountStatus ?? item.userStatus,
      item.statusId ?? item.status?.id
    ),
  };
};

const normalizeEmployeeCollection = (response = {}, options = {}) => {
  const rawItems = response?.data ?? response?.items ?? response?.records ?? [];

  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map(normalizeEmployee)
    .filter((employee) => options?.includeHidden || !shouldHideFromEmployeeDirectory(employee));
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

const getCollectionMeta = (response = {}) => {
  const recordCount = Number(
    response?.recordCount ??
      response?.totalCount ??
      response?.totalRecords ??
      response?.count
  );

  return {
    recordCount: Number.isFinite(recordCount) && recordCount >= 0 ? recordCount : null,
  };
};

const dedupeEmployees = (employees = []) => {
  const uniqueEmployees = new Map();

  employees.forEach((employee, index) => {
    const key = String(employee?.id ?? employee?.userName ?? `employee-${index}`);
    if (!uniqueEmployees.has(key)) {
      uniqueEmployees.set(key, employee);
    }
  });

  return Array.from(uniqueEmployees.values());
};

const normalizeCreateEmployeePayload = (payload = {}) => {
  const parsedManagerId = Number(payload?.managerId);
  const normalizedRoleIds = Array.from(
    new Set(
      (Array.isArray(payload?.roleIds) ? payload.roleIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  return {
    userName: String(payload?.userName ?? "").trim(),
    password: String(payload?.password ?? ""),
    fullName: String(payload?.fullName ?? "").trim(),
    managerId: Number.isInteger(parsedManagerId) && parsedManagerId > 0 ? parsedManagerId : null,
    roleIds: normalizedRoleIds,
  };
};

const buildCurrentOwnerManager = () => {
  const currentUser = getStoredUser();
  const currentRole = pickPrimarySystemRole(currentUser?.role ?? currentUser?.roles ?? "");

  if (currentRole !== "Owner") {
    return null;
  }

  const rawId = currentUser?.userId ?? currentUser?.id ?? null;
  const parsedId = Number(rawId);

  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return null;
  }

  return normalizeEmployee({
    id: parsedId,
    userName: currentUser?.userName ?? "",
    fullName: currentUser?.fullName ?? currentUser?.name ?? "Chủ xưởng",
    avatarUrl: currentUser?.avatarUrl ?? currentUser?.avartarUrl ?? "",
    email: currentUser?.email ?? "",
    phoneNumber: currentUser?.phoneNumber ?? currentUser?.phone ?? "",
    location: currentUser?.location ?? currentUser?.address ?? "",
    role: "Owner",
    status: "active",
    statusId: 1,
  });
};

async function fetchEmployeePages(endpoint, options = {}) {
  const pageSize = Number(options?.pageSize ?? 100);
  const startPageIndex = Number(options?.pageIndex ?? 0);
  const sortColumn = options?.sortColumn ?? "Name";
  const sortOrder = options?.sortOrder ?? "ASC";
  const filterQuery = String(options?.filterQuery ?? "").trim();
  const includeHidden = Boolean(options?.includeHidden);
  const pages = [];
  let pageIndex = startPageIndex;

  while (pageIndex < startPageIndex + 50) {
    const rawResponse = await axiosClient.get(endpoint, {
      params: {
        PageIndex: pageIndex,
        PageSize: pageSize,
        SortColumn: sortColumn,
        SortOrder: sortOrder,
        ...(filterQuery ? { FilterQuery: filterQuery } : {}),
      },
    });

    const response = parseApiPayload(rawResponse);
    const employees = normalizeEmployeeCollection(response, { includeHidden });
    const { recordCount } = getCollectionMeta(response);

    pages.push(...employees);

    if (employees.length === 0) break;

    const loadedCount = (pageIndex - startPageIndex) * pageSize + employees.length;
    if (recordCount != null && loadedCount >= recordCount) break;
    if (employees.length < pageSize) break;

    pageIndex += 1;
  }

  return dedupeEmployees(pages);
}

async function fetchEmployeesByPmPages(options = {}) {
  const pageSize = Number(options?.pageSize ?? 100);
  const startPageIndex = Number(options?.pageIndex ?? 0);
  const sortColumn = options?.sortColumn ?? "Name";
  const sortOrder = options?.sortOrder ?? "ASC";
  const filterQuery = String(options?.filterQuery ?? "").trim();
  const includeHidden = Boolean(options?.includeHidden);
  const pages = [];
  let pageIndex = startPageIndex;

  while (pageIndex < startPageIndex + 50) {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.WORKER.GET_ALL_EMPLOYEES_BY_PM_ID, {
      params: {
        PageIndex: pageIndex,
        PageSize: pageSize,
        SortColumn: sortColumn,
        SortOrder: sortOrder,
        ...(filterQuery ? { FilterQuery: filterQuery } : {}),
      },
    });

    const response = parseApiPayload(rawResponse);
    const employees = normalizeEmployeeCollection(response, { includeHidden });
    const { recordCount } = getCollectionMeta(response);

    pages.push(...employees);

    if (employees.length === 0) break;

    const loadedCount = (pageIndex - startPageIndex) * pageSize + employees.length;
    if (recordCount != null && loadedCount >= recordCount) break;
    if (employees.length < pageSize) break;

    pageIndex += 1;
  }

  return dedupeEmployees(pages);
}

async function fetchEmployeeByWorkerId(id, options = {}) {
  const rawResponse = await axiosClient.get(API_ENDPOINTS.WORKER.GET_BY_ID(id));
  const response = parseApiPayload(rawResponse);

  if (!response?.data) return null;

  const employee = normalizeEmployee(response.data);
  if (!options?.includeHidden && shouldHideFromEmployeeDirectory(employee)) return null;
  return employee;
}

const WorkerService = {
  async getAllEmployees(params, options = {}) {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.WORKER.GET_ALL_EMPLOYEES, params ? { params } : undefined);
    const response = parseApiPayload(rawResponse);
    const employees = normalizeEmployeeCollection(response, options);

    return {
      ...response,
      data: employees,
    };
  },

  async getEmployeeDirectory(options = {}) {
    const currentUser = getStoredUser();
    const primaryRole = pickPrimarySystemRole(currentUser?.role ?? currentUser?.roles ?? "");

    try {
      let employees;
      if (primaryRole === "PM") {
        employees = await fetchEmployeesByPmPages(options);
      } else {
        employees = await fetchEmployeePages(API_ENDPOINTS.WORKER.GET_ALL_EMPLOYEES, options);
      }

      return {
        data: employees,
        pageIndex: 0,
        pageSize: employees.length,
        recordCount: employees.length,
      };
    } catch (error) {
      if (error?.response?.status === 403) {
        return { data: [], pageIndex: 0, pageSize: 0, recordCount: 0 };
      }
      throw error;
    }
  },

  async getManagerDirectory(options = {}) {
    const currentUser = getStoredUser();
    const primaryRole = pickPrimarySystemRole(currentUser?.role ?? currentUser?.roles ?? "");

    try {
      let users;
      if (primaryRole === "PM") {
        users = await fetchEmployeesByPmPages({ ...options, includeHidden: true });
      } else {
        users = await fetchEmployeePages(API_ENDPOINTS.WORKER.GET_ALL_EMPLOYEES, {
          ...options,
          includeHidden: true,
        });
      }

      const currentOwner = buildCurrentOwnerManager();
      const managers = currentOwner ? dedupeEmployees([currentOwner, ...users]) : users;

      return {
        data: managers,
        pageIndex: 0,
        pageSize: managers.length,
        recordCount: managers.length,
      };
    } catch (error) {
      if (error?.response?.status === 403) {
        const currentOwner = buildCurrentOwnerManager();
        return {
          data: currentOwner ? [currentOwner] : [],
          pageIndex: 0,
          pageSize: currentOwner ? 1 : 0,
          recordCount: currentOwner ? 1 : 0,
        };
      }
      throw error;
    }
  },

  async getEmployeesByPmId(params, options = {}) {
    const rawResponse = await axiosClient.get(
      API_ENDPOINTS.WORKER.GET_ALL_EMPLOYEES_BY_PM_ID,
      params ? { params } : undefined
    );
    const response = parseApiPayload(rawResponse);
    const employees = normalizeEmployeeCollection(response, options);

    return {
      ...response,
      data: employees,
    };
  },

  async getEmployeeDirectoryByPmScope(options = {}) {
    const employees = await fetchEmployeesByPmPages(options);

    return {
      data: employees,
      pageIndex: 0,
      pageSize: employees.length,
      recordCount: employees.length,
    };
  },

  async getEmployeeById(id, options = {}) {
    return fetchEmployeeByWorkerId(id, options);
  },

  async createEmployee(payload) {
    const normalizedPayload = normalizeCreateEmployeePayload(payload);
    const token = getAuthItem("token");

    try {
      const response = await fetch(API_ENDPOINTS.WORKER.CREATE, {
        method: "POST",
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(normalizedPayload),
      });

      const rawPayload = await response.text().catch(() => "");
      const parsedPayload = rawPayload
        ? (() => {
            try {
              return JSON.parse(rawPayload);
            } catch {
              return rawPayload;
            }
          })()
        : {};

      if (!response.ok) {
        throw {
          response: {
            status: response.status,
            data: parsedPayload,
          },
        };
      }

      return normalizeEmployeeResponse(parseApiPayload(parsedPayload));
    } catch (error) {
      if (error?.response?.status === 404) {
        throw {
          ...error,
          response: {
            ...error.response,
            data: {
              ...error.response?.data,
              message:
                "Không tìm thấy API tạo nhân viên trên backend hiện tại. Hãy kiểm tra lại môi trường đang trỏ tới hoặc route /api/Worker/create-employee trên server.",
            },
          },
        };
      }

      throw error;
    }
  },

  async updateEmployee(id, payload) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.WORKER.UPDATE(id), payload);
    return parseApiPayload(rawResponse);
  },

  async assignWorkerSkill(id, skillIds = []) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.WORKER.ASSIGN_WORKER_SKILL(id), {
      skillIds: skillIds.map(Number),
    });
    return parseApiPayload(rawResponse);
  },

  async disableEmployeeAccount(id) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.USER.ADMIN_DISABLE_USER(id), null);
    return parseApiPayload(rawResponse);
  },

  async enableEmployeeAccount(id) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.USER.ADMIN_ENABLE_USER(id), null);
    return parseApiPayload(rawResponse);
  },
};

export default WorkerService;
