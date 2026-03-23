import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";
import { clearAuthStorage, getAuthItem, getStoredUser, setStoredUser } from "@/lib/authStorage";
import { countGrantedPermissions, getPermissionProfiles } from "@/lib/admin/adminMockStore";

const ADMIN_USER_ROLE_CACHE_KEY = "gpms-admin-user-role-cache";

const ROLE_CATALOG = [
  {
    key: "Admin",
    roleId: 1,
    label: "Quản trị hệ thống",
    shortLabel: "Toàn quyền hệ thống",
    tone: "danger",
    description: "Quản lý user, phân quyền và cấu hình hệ thống.",
  },
  {
    key: "Owner",
    roleId: 3,
    label: "Chủ xưởng",
    shortLabel: "Quyền điều hành",
    tone: "warning",
    description: "Theo dõi và phê duyệt các nghiệp vụ quan trọng của xưởng.",
  },
  {
    key: "PM",
    roleId: 4,
    label: "Quản lý sản xuất",
    shortLabel: "Điều phối vận hành",
    tone: "primary",
    description: "Quản lý sản xuất, nhân sự và tiến độ vận hành.",
  },
  {
    key: "Team Leader",
    roleId: 5,
    label: "Tổ trưởng",
    shortLabel: "Điều phối chuyền",
    tone: "info",
    description: "Phụ trách điều phối chuyền may và theo dõi năng suất tổ.",
  },
  {
    key: "Worker",
    roleId: 6,
    label: "Nhân viên",
    shortLabel: "Nhân sự vận hành",
    tone: "success",
    description: "Tài khoản nhân viên sản xuất và tác nghiệp hằng ngày.",
  },
  {
    key: "KCS",
    roleId: 7,
    label: "Kiểm soát chất lượng",
    shortLabel: "Kiểm soát chất lượng",
    tone: "info",
    description: "Theo dõi chất lượng và kiểm tra thành phẩm trong xưởng.",
  },
];

const ROLE_PRIORITY = ["Admin", "Owner", "PM", "Team Leader", "KCS", "Worker", "Customer"];

const ROLE_KEY_MAP = ROLE_CATALOG.reduce((map, item) => {
  map[item.key] = item;
  return map;
}, {});

const ROLE_ID_MAP = ROLE_CATALOG.reduce((map, item) => {
  map[item.roleId] = item.key;
  return map;
}, {});

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

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readRoleCache = () => {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(ADMIN_USER_ROLE_CACHE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeRoleCache = (value) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(ADMIN_USER_ROLE_CACHE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage write errors to keep admin screens usable.
  }
};

const getCurrentUserId = () => {
  const currentUser = getStoredUser();
  return String(currentUser?.userId ?? currentUser?.id ?? "");
};

const rememberUserRoles = (id, roleKeys = []) => {
  if (id == null) return;

  const nextRoleKeys = unique(roleKeys);
  if (!nextRoleKeys.length) return;

  const cache = readRoleCache();
  cache[String(id)] = {
    roleKeys: nextRoleKeys,
    updatedAt: new Date().toISOString(),
  };
  writeRoleCache(cache);
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

const getCurrentUserRoles = (id) => {
  const currentUser = getStoredUser();
  const currentId = getCurrentUserId();

  if (!currentId || String(id) !== currentId) {
    return [];
  }

  return splitRoles(currentUser?.role);
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

  const permissionProfile = getPermissionProfiles().find((profile) => profile.key === trimmedKey);
  if (permissionProfile) {
    return {
      key: permissionProfile.key,
      label: permissionProfile.label,
      shortLabel: permissionProfile.shortLabel,
      tone: permissionProfile.tone,
      description: permissionProfile.description,
      permissions: permissionProfile.permissions,
    };
  }

  return ROLE_KEY_MAP[trimmedKey] || {
    key: trimmedKey,
    label: trimmedKey,
    shortLabel: trimmedKey,
    tone: "info",
    description: "Vai trò này chưa có hồ sơ permission preview trong web admin.",
  };
};

const mapRoleIdsToKeys = (value) => {
  if (Array.isArray(value)) {
    return unique(
      value.map((item) => ROLE_ID_MAP[Number(item)] || "")
    );
  }

  const singleRole = ROLE_ID_MAP[Number(value)];
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

  const cachedRoles = readRoleCache()[String(item.id)]?.roleKeys || [];
  const currentUserRoles = getCurrentUserRoles(item.id);

  return unique([
    ...fromRoleIds,
    ...fromRolesField,
    ...fromStringFields,
    ...cachedRoles,
    ...currentUserRoles,
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
    roleLabel: roleMeta?.label || "Chưa đồng bộ role",
    roleTone: roleMeta?.tone || "info",
    roleShortLabel: roleMeta?.shortLabel || "Chưa có role",
    roleDescription: roleMeta?.description || "API user-list chưa trả thông tin role cho user này.",
    grantedPermissionCount: roleMeta?.permissions ? countGrantedPermissions(roleMeta) : 0,
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

  return error?.response?.data?.message || error?.response?.data?.title || fallbackMessage;
}

export function getAdminSupportedRoleOptions() {
  return ROLE_CATALOG.map((item) => ({
    key: item.key,
    label: item.label,
    tone: item.tone,
    shortLabel: item.shortLabel,
    description: item.description,
    roleId: item.roleId,
  }));
}

export function getAdminRoleProfile(roleKey) {
  return getRoleMeta(roleKey);
}

async function fetchAdminUserDetail(id) {
  const rawResponse = await axiosClient.get(API_ENDPOINTS.USER.ADMIN_USER_DETAIL(id));
  const response = parseApiPayload(rawResponse);
  const normalizedUser = normalizeAdminUser(response?.data ?? response);

  if (normalizedUser?.id != null && normalizedUser.roleKeys.length) {
    rememberUserRoles(normalizedUser.id, normalizedUser.roleKeys);
  }

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
        return foundInFilteredResult;
      }

      const fullDirectory = await fetchAdminUserPages();
      return fullDirectory.data.find(
        (user) => Number(user.id) === normalizedId || String(user.id) === String(id)
      ) || null;
    }
  },

  async createUser(payload) {
    const roleMeta = ROLE_KEY_MAP[String(payload?.roleKey ?? "").trim()];
    if (!roleMeta) {
      throw new Error("Unsupported role");
    }

    const createPayload = {
      userName: String(payload?.userName ?? "").trim(),
      password: String(payload?.password ?? ""),
      fullName: String(payload?.fullName ?? "").trim(),
      roleIds: [roleMeta.roleId],
    };

    const rawResponse = await axiosClient.post(API_ENDPOINTS.USER.ADMIN_CREATE_USER, createPayload);
    const response = parseApiPayload(rawResponse);
    let normalizedUser = normalizeAdminUser(response?.data ?? response);

    if (normalizedUser?.id != null) {
      rememberUserRoles(normalizedUser.id, [roleMeta.key]);
      return normalizedUser;
    }

    const refreshedUsers = await fetchAdminUserPages({
      pageSize: 50,
      filterQuery: createPayload.userName,
    });
    normalizedUser = refreshedUsers.data.find(
      (user) => String(user.userName).toLowerCase() === createPayload.userName.toLowerCase()
    ) || normalizedUser;

    if (normalizedUser?.id != null) {
      rememberUserRoles(normalizedUser.id, [roleMeta.key]);
    }

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

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw {
        response: {
          status: response.status,
          data: json,
        },
      };
    }

    const normalizedUser = normalizeAdminUser(json?.data ?? json);
    if (normalizedUser?.id != null && normalizedUser.roleKeys.length) {
      rememberUserRoles(normalizedUser.id, normalizedUser.roleKeys);
    }
    syncCurrentUserSnapshot(normalizedUser);

    return normalizedUser;
  },

  async assignRoles(id, roleKeys = []) {
    const normalizedRoleIds = unique(roleKeys)
      .map((roleKey) => ROLE_KEY_MAP[String(roleKey ?? "").trim()]?.roleId)
      .filter((roleId) => Number.isFinite(roleId));

    const rawResponse = await axiosClient.put(API_ENDPOINTS.USER.ADMIN_ASSIGN_ROLES(id), {
      roleIds: normalizedRoleIds,
    });

    rememberUserRoles(id, roleKeys);
    syncCurrentUserRoles(id, roleKeys);
    return parseApiPayload(rawResponse);
  },
};

export default AdminUserService;
