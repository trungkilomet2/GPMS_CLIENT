import { API_ENDPOINTS } from "@/lib/apiconfig";
import { extractRoleValue, extractUserIdValue } from "@/lib/authIdentity";
import { clearAuthStorage, getAuthItem, getStoredUser, removeAuthItem, setStoredUser } from "@/lib/authStorage";

const readAccountStatus = (source = {}) => {
  const status = String(
    source.status ??
    source.accountStatus ??
    source.userStatus ??
    ""
  ).trim().toLowerCase();

  const disabledFlag = source.disabled ?? source.isDisabled ?? source.locked ?? source.isLocked;
  const activeFlag = source.isActive ?? source.active;

  const isDisabled =
    disabledFlag === true ||
    activeFlag === false ||
    ["disabled", "inactive", "locked", "blocked", "banned"].includes(status);

  return { isDisabled, status };
};

const getToken  = () => getAuthItem("token");
const getUserId = () => {
  const id = getAuthItem("userId");
  if (id && id !== "null") return Number(id);
  const user = getStoredUser() || {};
  return user.userId ?? user.id ?? null;
};

const authHeadersGet  = () => ({
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
});

const authHeadersForm = () => ({
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
  // KHÔNG set Content-Type — browser tự đặt boundary cho multipart
});

const PROFILE_CACHE_PREFIX = "profile-cache:";

function isSwaggerPlaceholder(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "string" || v === "user@example.com";
}

function normalizeServerValue(value) {
  // Treat null/undefined/placeholder as empty. Keep real strings.
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";
  if (isSwaggerPlaceholder(s)) return "";
  return s;
}

function getProfileCache(userId) {
  if (!userId && userId !== 0) return null;

  try {
    const raw = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function setProfileCache(userId, profile) {
  if (!userId && userId !== 0) return;

  try {
    localStorage.setItem(`${PROFILE_CACHE_PREFIX}${userId}`, JSON.stringify(profile));
  } catch {
    // ignore quota/blocked storage
  }
}

function isOtpPendingResponse(payload = {}) {
  const message = String(payload?.message ?? payload?.title ?? "").trim().toLowerCase();
  if (!message) return false;
  return message.includes("otp");
}

export const userService = {

  /**
   * GET /api/User/view-profile
   * Response schema:
   * {
   *   data: {
   *     fullName:    string,
   *     phoneNumber: string,
   *     avartarUrl:  string,   ← typo từ backend (thiếu 'a')
   *     location:    string,
   *     email:       string
   *   },
   *   pageIndex:   number,
   *   pageSize:    number,
   *   recordCount: number,
   *   links:       [...]
   * }
   */
  async getProfile() {
    const res = await fetch(API_ENDPOINTS.USER.VIEW_PROFILE, {
      method:  "GET",
      credentials: "omit",
      headers: authHeadersGet(),
    });

    if (res.status === 401) {
      removeAuthItem("token");
      removeAuthItem("user");
      window.location.href = "/login";
      throw { status: 401 };
    }

    const json = await res.json();
    if (!res.ok) {
      throw {
        response: {
          status: res.status,
          data: json,
        },
      };
    }

    // Unwrap data, map đúng field (kể cả typo avartarUrl)
    const d = json.data ?? {};
    const accountStatus = readAccountStatus(d);

    if (accountStatus.isDisabled) {
      clearAuthStorage();
      throw {
        response: {
          data: {
            status: 403,
            message: "Tài khoản này đã bị vô hiệu hóa.",
          },
        },
      };
    }

    // Sync localStorage, but don't let empty server fields wipe existing stored values.
    const stored = getStoredUser() || {};
    const cached = getProfileCache(getUserId()) || {};

    const serverFullName = normalizeServerValue(d.fullName);
    const serverEmail = normalizeServerValue(d.email);
    const serverPhone = normalizeServerValue(d.phoneNumber);
    const serverAvatar = normalizeServerValue(d.avartarUrl);
    const serverLocation = normalizeServerValue(d.location);

    const fullName =
      serverFullName ||
      normalizeServerValue(stored.fullName) ||
      normalizeServerValue(stored.name) ||
      normalizeServerValue(cached.fullName) ||
      normalizeServerValue(cached.name) ||
      "";

    const email =
      serverEmail ||
      normalizeServerValue(stored.email) ||
      normalizeServerValue(cached.email) ||
      "";

    const phoneNumber =
      serverPhone ||
      normalizeServerValue(stored.phoneNumber) ||
      normalizeServerValue(stored.phone) ||
      normalizeServerValue(cached.phoneNumber) ||
      normalizeServerValue(cached.phone) ||
      "";

    const avatarUrl =
      serverAvatar ||
      normalizeServerValue(stored.avatarUrl) ||
      normalizeServerValue(cached.avatarUrl) ||
      "";

    const location =
      serverLocation ||
      normalizeServerValue(stored.location) ||
      normalizeServerValue(stored.address) ||
      normalizeServerValue(cached.location) ||
      normalizeServerValue(cached.address) ||
      "";

    const resolvedId = extractUserIdValue(d) || getUserId();
    const resolvedRole = extractRoleValue(d) || (stored.role ?? "");

    // IMPORTANT:
    // Backend's view-profile sometimes returns null/placeholder values.
    // Never let those wipe locally stored/cached values.
    const profile = {
      id:          resolvedId,
      userId:      resolvedId,
      fullName,
      name:        fullName,
      email:       String(email || "").trim(),
      emailFromServer: Boolean(serverEmail),
      phoneNumber: String(phoneNumber || "").trim(),
      phone:       String(phoneNumber || "").trim(),
      avatarUrl:   String(avatarUrl || "").trim(),
      location:    String(location || "").trim(),
      address:     String(location || "").trim(),
      role:        resolvedRole,
      managerId:   stored.managerId ?? cached.managerId ?? null,
      workerSkills: Array.isArray(stored.workerSkills) ? stored.workerSkills : (cached.workerSkills ?? []),
      accountStatus,
    };

    setStoredUser({
      ...stored,
      ...profile,
      bio: stored.bio ?? "",
      cooperationNotes: stored.cooperationNotes ?? [],
    });

    // Keep a per-user cache so profile values can survive logout/login
    // if backend's view-profile returns nulls intermittently.
    if (profile.userId != null) {
      setProfileCache(profile.userId, {
        ...cached,
        ...profile,
      });
    }

    return {
      ...profile,
      bio: stored.bio ?? "",
      cooperationNotes: stored.cooperationNotes ?? [],
    };
  },
  async getProfileById(userId) {
    if (userId == null) return null;
    const candidates = [
      API_ENDPOINTS.USER.USER_DETAIL?.(userId),
      API_ENDPOINTS.USER.GET_USER_DETAIL?.(userId),
      API_ENDPOINTS.USER.ADMIN_USER_DETAIL?.(userId),
    ].filter((endpoint, index, list) => endpoint && list.indexOf(endpoint) === index);

    let lastError = null;

    for (const endpoint of candidates) {
      const res = await fetch(endpoint, {
        method: "GET",
        credentials: "omit",
        headers: authHeadersGet(),
      });

      if (res.status === 401) {
        removeAuthItem("token");
        removeAuthItem("user");
        window.location.href = "/login";
        throw { status: 401 };
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastError = { response: { data: json, status: res.status } };
        // Fallback to the next endpoint if route/permission is different by role.
        if (res.status === 403 || res.status === 404) continue;
        throw lastError;
      }

      const d = json.data ?? json;
      const source = d.user ?? d;
      const fullName = normalizeServerValue(source.fullName ?? source.userFullName ?? source.name);
      const phoneNumber = normalizeServerValue(source.phoneNumber ?? source.phone);
      const email = normalizeServerValue(source.email);
      const avatarUrl = normalizeServerValue(source.avatarUrl ?? source.avartarUrl);
      const location = normalizeServerValue(source.location ?? source.address);

      return {
        id: source.id ?? source.userId ?? userId,
        userId: source.userId ?? source.id ?? userId,
        fullName,
        name: fullName,
        phoneNumber,
        phone: phoneNumber,
        email,
        avatarUrl,
        location,
        address: location,
      };
    }

    // All endpoints failed with 403/404 (permission or not found) — return null silently
    return null;
  },

  /**
   * PUT /api/User/update-profile
   * Body: multipart/form-data
   * Fields: FullName, PhoneNumber, AvartarUrl (file binary), Location, Email
   */
  async updateProfile(_userId, formData) {
    const endpoint = API_ENDPOINTS.USER.UPDATE_PROFILE;

    const res = await fetch(endpoint, {
      method:  "PUT",
      credentials: "omit",
      headers: authHeadersForm(),
      body:    formData,
    });

    if (res.status === 401) {
      removeAuthItem("token");
      removeAuthItem("user");
      window.location.href = "/login";
      throw { status: 401 };
    }

    const contentType = String(res.headers.get("content-type") || "").toLowerCase();
    let json = {};

    if (contentType.includes("application/json")) {
      json = await res.json().catch(() => ({}));
    } else {
      const raw = await res.text().catch(() => "");
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = {};
      }
    }

    if (!res.ok) throw { response: { data: json } };

    if (isOtpPendingResponse(json) && !json?.data) {
      return {
        ...json,
        otpRequired: true,
      };
    }

    // Sync localStorage từ response backend để tránh lệch dữ liệu hiển thị
    const d = json.data ?? {};
    const stored = getStoredUser() || {};
    const nextStored = {
      ...stored,
      id:          d.id          ?? stored.id,
      userId:      d.id          ?? stored.userId,
      userName:    d.userName    ?? stored.userName,
      fullName:    d.fullName    ?? stored.fullName,
      name:        d.fullName    ?? stored.name,
      role:        extractRoleValue(d) || stored.role,
      email:       d.email       ?? stored.email,
      phoneNumber: d.phoneNumber ?? stored.phoneNumber,
      phone:       d.phoneNumber ?? stored.phone,
      avatarUrl:   d.avartarUrl  ?? stored.avatarUrl,
      location:    d.location    ?? stored.location,
      address:     d.location    ?? stored.address,
      managerId:   d.managerId   ?? stored.managerId ?? null,
      workerSkills: d.workerSkills ?? stored.workerSkills ?? [],
    };

    setStoredUser(nextStored);

    const cacheId = nextStored.userId ?? nextStored.id;
    if (cacheId != null) {
      setProfileCache(cacheId, {
        ...(getProfileCache(cacheId) || {}),
        ...nextStored,
      });
    }

    window.dispatchEvent(new Event("auth-change"));

    return {
      ...json,
      otpRequired: false,
    };
  },
};
