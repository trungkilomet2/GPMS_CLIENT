import { API_ENDPOINTS } from "@/lib/apiconfig";
import { extractRoleValue, extractUserIdValue } from "@/lib/authIdentity";
import { clearAuthStorage, removeAuthItem, setAuthItem, setStoredUser } from "@/lib/authStorage";

const PROFILE_CACHE_PREFIX = "profile-cache:";

function isSwaggerPlaceholder(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "string" || normalized === "user@example.com";
}

function normalizeServerValue(value) {
  if (value == null) return "";
  const normalized = String(value).trim();
  if (!normalized || isSwaggerPlaceholder(normalized)) return "";
  return normalized;
}

function readProfileCache(userId) {
  if (userId == null) return null;
  try {
    const raw = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readAccountStatus(source = {}) {
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

  return {
    isDisabled,
    status,
  };
}

async function parseResponsePayload(res) {
  const contentType = String(res.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    return res.json().catch(() => ({}));
  }

  const raw = await res.text().catch(() => "");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

async function loadProfileAfterLogin(token) {
  try {
    const res = await fetch(API_ENDPOINTS.USER.VIEW_PROFILE, {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const json = await res.json().catch(() => ({}));
    const d = json?.data ?? {};
    const accountStatus = readAccountStatus(d);
    const fullName = normalizeServerValue(d.fullName);
    const email = normalizeServerValue(d.email);
    const phoneNumber = normalizeServerValue(d.phoneNumber);
    const avatarUrl = normalizeServerValue(d.avartarUrl);
    const location = normalizeServerValue(d.location);

    return {
      userId: extractUserIdValue(d),
      fullName,
      name: fullName,
      email,
      phoneNumber,
      phone: phoneNumber,
      role: extractRoleValue(d),
      avatarUrl,
      location,
      address: location,
      accountStatus,
    };
  } catch {
    return null;
  }
}

export const authService = {
  async login(payload) {
    const res = await fetch(API_ENDPOINTS.ACCOUNT.LOGIN, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: payload.userName,
        password: payload.password,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw {
        status: res.status,
        response: {
          status: res.status,
          data: {
            status: res.status,
            ...err,
          },
        },
      };
    }

    const rawToken = await res.text();
    const token = rawToken.replace(/^"|"$/g, "").trim();
    let decoded;
    try {
      const payload64 = token.split(".")[1];
      if (!payload64) throw new Error("Missing token payload");
      decoded = JSON.parse(atob(payload64));
    } catch {
      clearAuthStorage();
      throw {
        response: {
          data: {
            message: "Không thể xác thực phiên đăng nhập. Vui lòng thử lại.",
          },
        },
      };
    }

    const userName =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ??
      "";
    const requestedUserName = String(payload.userName ?? "").trim().toLowerCase();
    const decodedUserName = String(userName).trim().toLowerCase();

    if (requestedUserName && decodedUserName && requestedUserName !== decodedUserName) {
      clearAuthStorage();
      throw {
        response: {
          data: {
            message: "Token trả về không khớp với tài khoản vừa đăng nhập.",
          },
        },
      };
    }

    const fullName =
      decoded["fullName"] ??
      decoded["name"] ??
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"] ??
      userName;

    const role = extractRoleValue(decoded);
    const userId = extractUserIdValue(decoded);

    const tokenAccountStatus = readAccountStatus(decoded);

    const basicUser = {
      userId,
      userName,
      name: fullName || userName,
      fullName: fullName || userName,
      role,
      avatarUrl: "",
      accountStatus: tokenAccountStatus,
    };

    const profile = await loadProfileAfterLogin(token);
    const user = {
      ...basicUser,
      userId: profile?.userId || basicUser.userId,
      name: profile?.fullName || profile?.name || basicUser.name,
      fullName: profile?.fullName || basicUser.fullName,
      email: profile?.email || "",
      phoneNumber: profile?.phoneNumber || "",
      phone: profile?.phone || "",
      role: profile?.role || basicUser.role,
      avatarUrl: profile?.avatarUrl || basicUser.avatarUrl,
      location: profile?.location || "",
      address: profile?.address || "",
      accountStatus: profile?.accountStatus || basicUser.accountStatus,
    };

    // If backend view-profile returns nulls, reuse last known values from cache.
    const cached = readProfileCache(user.userId) || {};
    const mergedUser = {
      ...cached,
      ...user,
      name: normalizeServerValue(user.name) || normalizeServerValue(cached.fullName) || normalizeServerValue(cached.name) || basicUser.name,
      fullName: normalizeServerValue(user.fullName) || normalizeServerValue(cached.fullName) || normalizeServerValue(cached.name) || basicUser.fullName,
      email: normalizeServerValue(user.email) || normalizeServerValue(cached.email) || "",
      phoneNumber: normalizeServerValue(user.phoneNumber) || normalizeServerValue(cached.phoneNumber) || normalizeServerValue(cached.phone) || "",
      phone: normalizeServerValue(user.phone) || normalizeServerValue(cached.phoneNumber) || normalizeServerValue(cached.phone) || "",
      location: normalizeServerValue(user.location) || normalizeServerValue(cached.location) || normalizeServerValue(cached.address) || "",
      address: normalizeServerValue(user.address) || normalizeServerValue(cached.location) || normalizeServerValue(cached.address) || "",
      avatarUrl: normalizeServerValue(user.avatarUrl) || normalizeServerValue(cached.avatarUrl) || "",
    };

    if (user.accountStatus?.isDisabled) {
      clearAuthStorage();
      throw {
        response: {
          data: {
            message: "Tài khoản này đã bị vô hiệu hóa.",
          },
        },
      };
    }

    setAuthItem("token", token);
    setStoredUser(mergedUser);

    if (mergedUser.userId != null) {
      setAuthItem("userId", String(mergedUser.userId));
    } else {
      removeAuthItem("userId");
    }

    window.dispatchEvent(new Event("auth-change"));

    return { token, user: mergedUser };
  },

  async register(payload) {
    const res = await fetch(API_ENDPOINTS.ACCOUNT.REGISTER, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: payload.userName,
        fullName: payload.fullName,
        password: payload.password,
        rePassword: payload.rePassword,
        email: payload.email,
      }),
    });

    const data = await parseResponsePayload(res);
    if (!res.ok) throw { response: { data } };
    return data;
  },

  async sendRegisterOtp(payload) {
    const res = await fetch(API_ENDPOINTS.EMAIL.SEND_OTP, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
      }),
    });

    const data = await parseResponsePayload(res);
    if (!res.ok) throw { response: { data } };
    return data;
  },

  async resendRegisterOtp(payload) {
    const res = await fetch(API_ENDPOINTS.EMAIL.RESEND_OTP, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
      }),
    });

    const data = await parseResponsePayload(res);
    if (!res.ok) throw { response: { data } };
    return data;
  },

  async requestPasswordReset(payload) {
    const endpoint = API_ENDPOINTS.ACCOUNT.FORGOT_PASSWORD;

    if (!endpoint) {
      return {
        success: true,
        email: payload.email,
      };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
      }),
    });

    const data = await parseResponsePayload(res);
    if (!res.ok) throw { response: { data } };
    return data;
  },

  async verifyRegisterOtp(payload) {
    const res = await fetch(API_ENDPOINTS.EMAIL.VERIFY_EMAIL, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
        otp: payload.otp,
      }),
    });

    const data = await parseResponsePayload(res);
    if (!res.ok) throw { response: { data } };
    return data;
  },

  logout() {
    clearAuthStorage();
    window.dispatchEvent(new Event("auth-change"));
  },
};
