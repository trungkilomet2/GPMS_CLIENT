import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import {
  getAllowedManagerRoles,
  getManagerRoleHint,
  getRoleHierarchyTag,
  getSystemRoleLabel,
  getWorkerSkillLabel,
  pickPrimarySystemRole,
  splitRoles,
} from "@/lib/orgHierarchy";
import ProductionPartService from "@/services/ProductionPartService";
import ProductionService from "@/services/ProductionService";

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
  const roles = splitRoles(item.role ?? item.roles ?? item.roleName ?? item.roleNames ?? "");
  const role = roles.join(", ");
  const workerSkillCandidates = splitRoles(
    item.workerSkill ?? item.workerRole ?? item.workerSkills ?? item.workerRoles ?? ""
  );
  const workerRole = workerSkillCandidates[0] ?? "";
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

function getProductionPmId(item = {}) {
  return item?.pmInfo?.id ?? item?.pmId ?? item?.pmID ?? item?.pm_id ?? item?.pm?.id ?? item?.pm?.userId ?? null;
}

function getProductionDateRange(item = {}) {
  return {
    fromDate: item?.startDate ?? item?.pStartDate ?? item?.order?.startDate ?? null,
    toDate: item?.endDate ?? item?.pEndDate ?? item?.order?.endDate ?? null,
  };
}

function toComparableTime(value) {
  const date = new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

function normalizePmAssignedWorker(item = {}) {
  const workerInfo = item.workerInfo ?? item;
  const roleNames = splitRoles(
    workerInfo.role ??
    workerInfo.roles ??
    item.role ??
    "Worker"
  );
  const workerSkillNames = Array.isArray(item.workerSkillInfo)
    ? item.workerSkillInfo
      .map((skill) => skill?.skillName ?? skill?.name ?? skill?.workerSkillName ?? "")
      .filter(Boolean)
    : splitRoles(
      item.workerSkill ??
      item.workerSkills ??
      workerInfo.workerSkill ??
      workerInfo.workerSkills ??
      item.frequentSteps ??
      workerInfo.frequentSteps ??
      ""
    );
  const workerSkill = workerSkillNames[0] ?? "";
  const leaveRecords = Array.isArray(item.workerLrInfo) ? item.workerLrInfo : [];
  const hasLeaveRecord = leaveRecords.length > 0;

  return normalizeEmployee({
    id: workerInfo.workerId ?? workerInfo.id ?? item.workerId ?? item.id ?? null,
    userName: workerInfo.userName ?? workerInfo.username ?? "",
    fullName: workerInfo.workerName ?? workerInfo.fullName ?? item.fullName ?? "Chưa cập nhật",
    phoneNumber: workerInfo.phoneNumber ?? item.phoneNumber ?? "",
    avatarUrl: workerInfo.avatarUrl ?? workerInfo.avartarUrl ?? item.avatarUrl ?? "",
    location: workerInfo.location ?? item.location ?? "",
    email: workerInfo.email ?? item.email ?? "",
    role: roleNames.length ? roleNames.join(", ") : "Worker",
    workerSkill,
    workerSkills: workerSkillNames,
    managerId: workerInfo.managerId ?? item.managerId ?? null,
    managerName: workerInfo.managerName ?? item.managerName ?? "",
    statusId: hasLeaveRecord ? 2 : (item.statusId ?? workerInfo.statusId ?? 1),
    status: hasLeaveRecord ? "inactive" : (item.status ?? workerInfo.status ?? "active"),
  });
}

async function fetchEmployeesForPmScope() {
  const user = getStoredUser() || {};
  const currentUserId = Number(user.userId ?? user.id ?? 0);

  if (!Number.isFinite(currentUserId) || currentUserId <= 0) {
    throw new Error("Không xác định được PM hiện tại để tải danh sách worker.");
  }

  const productionResponse = await ProductionService.getProductionList({
    PageIndex: 0,
    PageSize: 100,
    SortColumn: "Name",
    SortOrder: "ASC",
  });
  const productionPayload = parseApiPayload(productionResponse);
  const productionList = Array.isArray(productionPayload?.data)
    ? productionPayload.data
    : Array.isArray(productionPayload)
      ? productionPayload
      : [];
  const pmProductions = productionList.filter(
    (item) => String(getProductionPmId(item) ?? "") === String(currentUserId)
  );

  if (!pmProductions.length) {
    return [];
  }

  const fallbackPmId = Number(getProductionPmId(pmProductions[0]) ?? currentUserId);
  const ranges = pmProductions
    .map(getProductionDateRange)
    .filter((range) => range.fromDate || range.toDate);

  const fromDate = ranges.reduce((earliest, current) => {
    if (!current?.fromDate) return earliest;
    if (!earliest) return current.fromDate;
    const currentTime = toComparableTime(current.fromDate);
    const earliestTime = toComparableTime(earliest);
    if (currentTime == null) return earliest;
    if (earliestTime == null || currentTime < earliestTime) return current.fromDate;
    return earliest;
  }, "");
  const toDate = ranges.reduce((latest, current) => {
    if (!current?.toDate) return latest;
    if (!latest) return current.toDate;
    const currentTime = toComparableTime(current.toDate);
    const latestTime = toComparableTime(latest);
    if (currentTime == null) return latest;
    if (latestTime == null || currentTime > latestTime) return current.toDate;
    return latest;
  }, "");

  const rawResponse = await ProductionPartService.getAssignWorkers({
    PMId: fallbackPmId,
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  });
  const response = parseApiPayload(rawResponse);
  const rawItems = response?.data ?? response?.items ?? response?.records ?? response ?? [];

  if (!Array.isArray(rawItems)) {
    return [];
  }

  const employeesById = new Map();

  rawItems.forEach((item) => {
    const employee = normalizePmAssignedWorker(item);
    if (employee.id == null) return;

    const key = String(employee.id);
    const existing = employeesById.get(key);
    if (!existing) {
      employeesById.set(key, employee);
      return;
    }

    const mergedSkillLabels = Array.from(
      new Set([existing.workerSkill, employee.workerSkill].filter(Boolean))
    );
    employeesById.set(key, {
      ...existing,
      ...employee,
      workerSkill: existing.workerSkill || employee.workerSkill,
      workerSkillLabel: existing.workerSkillLabel || employee.workerSkillLabel,
      status: existing.status === "active" || employee.status === "active" ? "active" : employee.status,
      role: Array.from(new Set([...existing.roles, ...employee.roles])).join(", "),
      roles: Array.from(new Set([...existing.roles, ...employee.roles])),
      roleLabels: Array.from(new Set([...existing.roleLabels, ...employee.roleLabels])),
      workerSkills: mergedSkillLabels,
    });
  });

  return Array.from(employeesById.values());
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
    let response;
    let employees;
    const primaryRole = getPrimaryWorkspaceRole(getStoredUser()?.role);
    const shouldPreferPmScope =
      primaryRole === "pm" &&
      options?.preferPmScope !== false;

    if (shouldPreferPmScope) {
      employees = await fetchEmployeesForPmScope();
      response = {
        data: employees,
        usedPmFallback: true,
      };

      return {
        ...response,
        data: employees,
      };
    }

    try {
      const rawResponse = await axiosClient.get(API_ENDPOINTS.WORKER.GET_ALL_EMPLOYEES, params ? { params } : undefined);
      response = parseApiPayload(rawResponse);
      employees = normalizeEmployeeCollection(response, options);
    } catch (error) {
      const canUsePmFallback =
        error?.response?.status === 403 &&
        primaryRole === "pm" &&
        options?.allowPmFallback !== false;

      if (!canUsePmFallback) {
        throw error;
      }

      employees = await fetchEmployeesForPmScope();
      response = {
        data: employees,
        usedPmFallback: true,
      };
    }

    return {
      ...response,
      data: employees,
    };
  },

  async getEmployeeById(id, options = {}) {
    return fetchEmployeeByWorkerId(id, options);
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
