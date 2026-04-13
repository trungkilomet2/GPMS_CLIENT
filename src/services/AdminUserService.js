import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";
import { clearAuthStorage, getAuthItem, getStoredUser, setStoredUser } from "@/lib/authStorage";
import { getSystemRoleLabel } from "@/lib/orgHierarchy";
import PermissionService from "@/services/PermissionService";

const ROLE_DISPLAY_META = {
  Admin: {
    label: "Quản trị hệ thống",
    shortLabel: "Quản trị hệ thống",
    tone: "danger",
    description: "Vai trò quản trị được hệ thống trả về từ dữ liệu quyền hiện tại.",
  },
  Owner: {
    label: "Chủ xưởng",
    shortLabel: "Chủ xưởng",
    tone: "warning",
    description: "Vai trò điều hành xưởng được hệ thống trả về từ dữ liệu quyền hiện tại.",
  },
  PM: {
    label: "Quản lý sản xuất",
    shortLabel: "Quản lý sản xuất",
    tone: "primary",
    description: "Vai trò quản lý sản xuất được hệ thống trả về từ dữ liệu quyền hiện tại.",
  },
  Worker: {
    label: "Nhân viên",
    shortLabel: "Nhân viên",
    tone: "success",
    description: "Vai trò nhân viên được hệ thống trả về từ dữ liệu quyền hiện tại.",
  },
  Customer: {
    label: "Khách hàng",
    shortLabel: "Khách hàng",
    tone: "info",
    description: "Vai trò khách hàng được hệ thống trả về từ dữ liệu quyền hiện tại.",
  },
};

const ROLE_PRIORITY = ["Admin", "Owner", "PM", "Worker", "Customer"];
const FALLBACK_ROLE_DIRECTORY = [
  { id: 1, key: "Admin" },
  { id: 2, key: "Customer" },
  { id: 3, key: "Owner" },
  { id: 4, key: "PM" },
  { id: 5, key: "Worker" },
].map((role) => {
  const meta = ROLE_DISPLAY_META[role.key] || {};
  return {
    ...role,
    label: meta.label || getSystemRoleLabel(role.key),
    shortLabel: meta.shortLabel || meta.label || getSystemRoleLabel(role.key),
    tone: meta.tone || "info",
    description: meta.description || `Vai trò ${role.key} đang dùng bản dự phòng từ frontend.`,
  };
});
const FALLBACK_ROLE_ID_MAP = FALLBACK_ROLE_DIRECTORY.reduce((map, item) => {
  map[item.id] = item.key;
  return map;
}, {});
let roleDirectoryCache = [];
let roleDirectoryPromise = null;

const parseApiPayload = (rawResponse) => {
  if (typeof rawResponse !== "string") {
    return rawResponse ?? {};
  }

  try {
    return JSON.parse(rawResponse);
  } catch {
    return {};
  }
};

const splitRoles = (value = "") => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const unique = (values = []) => Array.from(new Set(values.filter(Boolean)));

const getRolePriorityIndex = (roleKey = "") => {
  const index = ROLE_PRIORITY.indexOf(roleKey);
  return index === -1 ? ROLE_PRIORITY.length + 1 : index;
};

const buildRoleDirectory = (permissions = []) => {
  const roleMap = new Map();

  permissions.forEach((permission) => {
    const roles = Array.isArray(permission?.roles) ? permission.roles : [];
    roles.forEach((role) => {
      const id = Number(role?.id ?? 0);
      const key = String(role?.name ?? "").trim();
      if (!id || !key || roleMap.has(key)) return;

      const meta = ROLE_DISPLAY_META[key] || {};
      roleMap.set(key, {
        id,
        key,
        label: meta.label || getSystemRoleLabel(key),
        shortLabel: meta.shortLabel || meta.label || getSystemRoleLabel(key),
        tone: meta.tone || "info",
        description: meta.description || `Vai trò ${key} đang được đồng bộ từ dữ liệu quyền hiện tại.`,
      });
    });
  });

  return Array.from(roleMap.values()).sort((left, right) => {
    const priorityDiff = getRolePriorityIndex(left.key) - getRolePriorityIndex(right.key);
    if (priorityDiff !== 0) return priorityDiff;
    return left.label.localeCompare(right.label, "vi");
  });
};

async function fetchRoleDirectory(force = false) {
  if (!force && roleDirectoryCache.length > 0) {
    return roleDirectoryCache;
  }

  if (!force && roleDirectoryPromise) {
    return roleDirectoryPromise;
  }

  roleDirectoryPromise = PermissionService.getPermissions()
    .then((response) => {
      const directory = buildRoleDirectory(response?.data ?? []);
      roleDirectoryCache = directory.length > 0 ? directory : FALLBACK_ROLE_DIRECTORY;
      return roleDirectoryCache;
    })
    .catch(() => {
      roleDirectoryCache = FALLBACK_ROLE_DIRECTORY;
      return roleDirectoryCache;
    })
    .finally(() => {
      roleDirectoryPromise = null;
    });

  return roleDirectoryPromise;
}

const extractNamesFromCollection = (collection = []) => {
  if (!Array.isArray(collection)) return [];

  return unique(
    collection
      .map((item) => {
        if (item && typeof item === "object") {
          return String(item.name ?? item.key ?? item.label ?? "").trim();
        }

        return String(item ?? "").trim();
      })
      .filter(Boolean)
  );
};

const normalizeManagerId = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }
  return numericValue;
};

const getCurrentUserId = () => {
  const currentUser = getStoredUser();
  return String(currentUser?.userId ?? currentUser?.id ?? "");
};

const syncCurrentUserRoles = (id, roleKeys = []) => {
  const currentUser = getStoredUser();
  const currentId = getCurrentUserId();

  if (!currentId || String(id) !== currentId) {
    return false;
  }

  setStoredUser({
    ...currentUser,
    role: unique(roleKeys).join(", ") || currentUser?.role,
  });

  window.dispatchEvent(new Event("auth-change"));
  return true;
};

const getMultipartAuthHeaders = () => {
  const token = getAuthItem("token");
  const userId = getAuthItem("userId");
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (userId) {
    headers.UserId = userId;
    headers["X-User-Id"] = userId;
  }

  return headers;
};

const syncCurrentUserSnapshot = (user) => {
  const currentUser = getStoredUser();
  const currentId = String(currentUser?.userId ?? currentUser?.id ?? "");

  if (!currentId || String(user?.id ?? "") !== currentId) {
    return;
  }

  setStoredUser({
    ...currentUser,
    fullName: user.fullName ?? currentUser?.fullName,
    name: user.fullName ?? currentUser?.name,
    userName: user.userName ?? currentUser?.userName,
    email: user.email ?? currentUser?.email,
    phoneNumber: user.phoneNumber ?? currentUser?.phoneNumber,
    phone: user.phoneNumber ?? currentUser?.phone,
    avatarUrl: user.avatarUrl ?? currentUser?.avatarUrl,
    avartarUrl: user.avatarUrl ?? currentUser?.avartarUrl,
    location: user.location ?? currentUser?.location,
    address: user.location ?? currentUser?.address,
    role: user.roleKeys?.join(", ") || currentUser?.role,
  });

  window.dispatchEvent(new Event("auth-change"));
};

const getRoleMeta = (roleKey = "") => {
  const trimmedKey = String(roleKey ?? "").trim();
  if (!trimmedKey) return null;

  return ROLE_DISPLAY_META[trimmedKey] || {
    key: trimmedKey,
    label: getSystemRoleLabel(trimmedKey),
    shortLabel: getSystemRoleLabel(trimmedKey),
    tone: "info",
    description: "Vai trò này chưa có mô tả riêng trong frontend và sẽ hiển thị theo dữ liệu backend trả về.",
  };
};

const parseFetchPayload = async (response) => {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }

  const raw = await response.text().catch(() => "");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return { data: raw };
  }
};

const flattenValidationErrors = (errors) => {
  if (!errors || typeof errors !== "object") return [];

  return Object.values(errors)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
};

const mapRoleIdsToKeys = (value) => {
  if (Array.isArray(value)) {
    return unique(
      value.map((item) => FALLBACK_ROLE_ID_MAP[Number(item)] || "")
    );
  }

  const singleRole = FALLBACK_ROLE_ID_MAP[Number(value)];
  return singleRole ? [singleRole] : [];
};

const extractRoleKeys = (item = {}) => {
  const fromRoleIds = unique([
    ...mapRoleIdsToKeys(item.roleIds),
    ...mapRoleIdsToKeys(item.roleId),
  ]);

  const rawRoles = Array.isArray(item.roles) ? item.roles : [];
  const namedRoles = extractNamesFromCollection(rawRoles);
  const numericRoles = rawRoles.length > 0 && rawRoles.every((value) => Number.isFinite(Number(value)));
  const fromRolesField = numericRoles
    ? mapRoleIdsToKeys(rawRoles)
    : namedRoles;

  const fromStringFields = unique([
    ...splitRoles(item.role),
    ...splitRoles(item.roleName),
  ]);

  return unique([
    ...fromRoleIds,
    ...fromRolesField,
    ...fromStringFields,
  ]);
};

const pickPrimaryRole = (roleKeys = []) => {
  for (const roleKey of ROLE_PRIORITY) {
    if (roleKeys.includes(roleKey)) {
      return roleKey;
    }
  }

  return roleKeys[0] || "";
};

const normalizeAdminStatus = (statusId, rawStatus) => {
  const numericStatusId = Number(statusId);
  if (Number.isFinite(numericStatusId)) {
    if (numericStatusId === 1) return "active";
    if (numericStatusId === 2) return "inactive";
  }

  const normalizedStatus =
    rawStatus && typeof rawStatus === "object"
      ? rawStatus.name ?? rawStatus.label ?? rawStatus.value ?? ""
      : rawStatus;
  const normalized = String(normalizedStatus ?? "").trim().toLowerCase();
  if (["1", "active", "enabled", "working"].includes(normalized)) return "active";
  if (["invited", "invite", "pending activation"].includes(normalized)) return "invited";
  if (["locked", "lock"].includes(normalized)) return "locked";
  if (["suspended", "blocked", "banned"].includes(normalized)) return "suspended";
  if (["2", "inactive", "disabled"].includes(normalized)) return "inactive";
  return "inactive";
};

const buildFallbackTimestamps = (item = {}) => ({
  createdAt: item.createdAt ?? "",
  updatedAt: item.updatedAt ?? "",
  lastLogin: item.lastLogin ?? item.lastActiveAt ?? "",
});

const normalizeAdminUser = (item = {}) => {
  const roleNames = unique([
    ...extractNamesFromCollection(item.roles),
    ...splitRoles(item.role),
    ...splitRoles(item.roleName),
  ]);
  const workerRoleNames = unique([
    ...extractNamesFromCollection(item.workerRoles),
    ...extractNamesFromCollection(item.workerSkills),
    ...splitRoles(item.workerRole),
    ...splitRoles(item.workerSkill),
  ]);
  const roleKeys = extractRoleKeys(item);
  const primaryRole = pickPrimaryRole(roleKeys);
  const roleMeta = getRoleMeta(primaryRole);
  const status = normalizeAdminStatus(
    item.statusId ?? item.status?.id,
    item.status ?? item.accountStatus ?? item.userStatus
  );
  const timestamps = buildFallbackTimestamps(item);

  return {
    id: item.id ?? null,
    userName: item.userName ?? "",
    fullName: item.fullName ?? item.userFullName ?? "Chưa cập nhật",
    phoneNumber: item.phoneNumber ?? "",
    avatarUrl: item.avatarUrl ?? item.avartarUrl ?? "",
    location: item.location ?? "",
    email: item.email ?? "",
    managerId: normalizeManagerId(item.managerId),
    statusId: item.statusId ?? item.status?.id ?? (status === "active" ? 1 : 2),
    status,
    roleNames,
    roleKeys,
    roleKey: primaryRole,
    roleLabel: roleMeta?.label || "Chưa đồng bộ vai trò",
    roleTone: roleMeta?.tone || "info",
    roleShortLabel: roleMeta?.shortLabel || "Chưa có vai trò",
    roleDescription: roleMeta?.description || "Vai trò hiện được hiển thị theo dữ liệu backend trả về.",
    grantedPermissionCount: null,
    hasKnownRole: Boolean(primaryRole),
    workerRole: workerRoleNames[0] || "",
    workerRoleLabel: workerRoleNames[0] || "",
    workerSkillNames: workerRoleNames,
    ...timestamps,
  };
};

const normalizeUserCollection = (response = {}) => {
  const rawItems = response?.data ?? response?.items ?? response?.records ?? [];

  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems.map(normalizeAdminUser);
};

const dedupeUsersById = (users = []) => {
  const seen = new Map();

  users.forEach((user) => {
    const key = user?.id ?? `${user?.userName}-${user?.fullName}`;
    if (!seen.has(key)) {
      seen.set(key, user);
    }
  });

  return Array.from(seen.values());
};

async function fetchAdminUserPages({
  pageSize = 100,
  sortColumn = "Name",
  sortOrder = "ASC",
  filterQuery = null,
} = {}) {
  const normalizedPageSize = Math.max(1, Number(pageSize) || 100);
  const pages = [];
  let pageIndex = 0;
  let recordCount = 0;
  let hasMore = true;

  while (hasMore) {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.USER.ADMIN_USER_LIST, {
      params: {
        PageIndex: pageIndex,
        PageSize: normalizedPageSize,
        SortColumn: sortColumn,
        SortOrder: sortOrder,
        ...(filterQuery ? { FilterQuery: filterQuery } : {}),
      },
    });

    const response = parseApiPayload(rawResponse);
    const pageUsers = normalizeUserCollection(response);
    const nextRecordCount = Number(
      response?.recordCount ?? response?.totalCount ?? response?.totalRecords ?? 0
    );

    pages.push(...pageUsers);
    if (Number.isFinite(nextRecordCount) && nextRecordCount > 0) {
      recordCount = nextRecordCount;
    }

    if (!pageUsers.length) {
      hasMore = false;
      continue;
    }

    if (recordCount > 0 && pages.length >= recordCount) {
      hasMore = false;
      continue;
    }

    if (pageUsers.length < normalizedPageSize) {
      hasMore = false;
      continue;
    }

    pageIndex += 1;
  }

  const users = dedupeUsersById(pages);

  return {
    data: users,
    pageIndex: 0,
    pageSize: users.length,
    recordCount: recordCount || users.length,
  };
}

export function getAdminUserErrorMessage(error, fallbackMessage) {
  if (error?.response?.status === 403) {
    return "Bạn không có quyền truy cập chức năng admin này.";
  }

  const validationMessages = flattenValidationErrors(error?.response?.data?.errors);
  if (validationMessages.length > 0) {
    return validationMessages.join(" ");
  }

  return error?.response?.data?.message || error?.response?.data?.detail || error?.response?.data?.title || fallbackMessage;
}

export async function getAdminSupportedRoleOptions() {
  return fetchRoleDirectory();
}

export async function getAdminRoleProfile(roleKey) {
  const directory = await fetchRoleDirectory();
  return directory.find((role) => role.key === roleKey) || getRoleMeta(roleKey);
}

async function fetchAdminUserDetail(id) {
  const rawResponse = await axiosClient.get(API_ENDPOINTS.USER.ADMIN_USER_DETAIL(id));
  const response = parseApiPayload(rawResponse);
  const normalizedUser = {
    ...normalizeAdminUser(response?.data ?? response),
    detailAvailable: true,
  };

  return normalizedUser;
}

const AdminUserService = {
  async getUsers(options = {}) {
    return fetchAdminUserPages(options);
  },

  async getUserById(id) {
    try {
      return await fetchAdminUserDetail(id);
    } catch (error) {
      if (error?.response?.status && error.response.status !== 404) {
        throw error;
      }

      const normalizedId = Number(id);
      const filteredUsers = await fetchAdminUserPages({
        pageSize: 50,
        filterQuery: String(id),
      });

        const foundInFilteredResult = filteredUsers.data.find(
          (user) => Number(user.id) === normalizedId || String(user.id) === String(id)
        );

      if (foundInFilteredResult) {
          return {
            ...foundInFilteredResult,
            detailAvailable: false,
          };
      }

      const fullDirectory = await fetchAdminUserPages();
      const foundInDirectory = fullDirectory.data.find(
        (user) => Number(user.id) === normalizedId || String(user.id) === String(id)
      );

      return foundInDirectory
        ? {
            ...foundInDirectory,
            detailAvailable: false,
          }
        : null;
    }
  },

  async createUser(payload) {
    const roleDirectory = await fetchRoleDirectory();
    const roleMeta = roleDirectory.find((role) => role.key === String(payload?.roleKey ?? "").trim());
    if (!roleMeta) {
      throw new Error("Vai trò này hiện chưa được hỗ trợ.");
    }

    const createPayload = {
      userName: String(payload?.userName ?? "").trim(),
      password: String(payload?.password ?? ""),
      fullName: String(payload?.fullName ?? "").trim(),
      roleId: roleMeta.roleId,
      roleIds: [roleMeta.roleId],
    };

    const rawResponse = await axiosClient.post(API_ENDPOINTS.USER.ADMIN_CREATE_USER, createPayload);
    const response = parseApiPayload(rawResponse);
    let normalizedUser = normalizeAdminUser(response?.data ?? response);

    if (normalizedUser?.id != null) {
      return normalizedUser;
    }

    const refreshedUsers = await fetchAdminUserPages({
      pageSize: 50,
      filterQuery: createPayload.userName,
    });
    normalizedUser = refreshedUsers.data.find(
      (user) => String(user.userName).toLowerCase() === createPayload.userName.toLowerCase()
    ) || normalizedUser;

    return normalizedUser;
  },

  async disableUser(id) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.USER.ADMIN_DISABLE_USER(id), null);
    const response = parseApiPayload(rawResponse);

    if (getCurrentUserId() && String(id) === getCurrentUserId()) {
      clearAuthStorage();
      window.dispatchEvent(new Event("auth-change"));

      if (window.location.pathname !== "/login") {
        window.location.href = "/login?reason=disabled";
      }

      return {
        ...(response && typeof response === "object" ? response : { data: response }),
        currentUserSignedOut: true,
      };
    }

    return response;
  },

  async enableUser(id) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.USER.ADMIN_ENABLE_USER(id), null);
    return parseApiPayload(rawResponse);
  },

  async updateUser(id, payload = {}) {
    const formData = new FormData();

    formData.append("FullName", String(payload?.fullName ?? "").trim());
    formData.append("PhoneNumber", String(payload?.phoneNumber ?? "").trim());
    formData.append("Location", String(payload?.location ?? "").trim());
    formData.append("Email", String(payload?.email ?? "").trim());

    if (payload?.avatarFile instanceof File) {
      formData.append("AvartarUrl", payload.avatarFile);
    }

    const response = await fetch(API_ENDPOINTS.USER.ADMIN_UPDATE_USER(id), {
      method: "PUT",
      credentials: "omit",
      headers: getMultipartAuthHeaders(),
      body: formData,
    });

    if (response.status === 401) {
      clearAuthStorage();
      window.dispatchEvent(new Event("auth-change"));

      if (window.location.pathname !== "/login") {
        window.location.href = "/login?reason=unauthorized";
      }

      throw { status: 401 };
    }

    const json = await parseFetchPayload(response);

    if (!response.ok) {
      throw {
        response: {
          status: response.status,
          data: json,
        },
      };
    }

    const normalizedUser = normalizeAdminUser(json?.data ?? json);
    syncCurrentUserSnapshot(normalizedUser);

    return normalizedUser;
  },

  async assignRoles(id, roleKeys = []) {
    const roleDirectory = await fetchRoleDirectory();
    const normalizedRoleIds = unique(roleKeys)
      .map((roleKey) => roleDirectory.find((role) => role.key === String(roleKey ?? "").trim())?.id)
      .filter((roleId) => Number.isFinite(roleId));

    if (!normalizedRoleIds.length) {
      throw new Error("Không có vai trò hợp lệ để gán cho tài khoản.");
    }

    const rawResponse = await axiosClient.put(API_ENDPOINTS.USER.ADMIN_ASSIGN_ROLES(id), {
      roleIds: normalizedRoleIds,
    });

    syncCurrentUserRoles(id, roleKeys);
    return parseApiPayload(rawResponse);
  },
};

export default AdminUserService;
