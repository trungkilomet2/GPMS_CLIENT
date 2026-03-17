import { API_ENDPOINTS } from "@/lib/apiconfig";
import { extractRoleValue, extractUserIdValue } from "@/lib/authIdentity";
import { clearAuthStorage, removeAuthItem, setAuthItem, setStoredUser } from "@/lib/authStorage";

const PROFILE_CACHE_PREFIX = "profile-cache:";

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

    return {
      userId: extractUserIdValue(d),
      fullName: d.fullName || "",
      name: d.fullName || "",
      email: d.email || "",
      phoneNumber: d.phoneNumber || "",
      phone: d.phoneNumber || "",
      role: extractRoleValue(d),
      avatarUrl: d.avartarUrl || "",
      location: d.location || "",
      address: d.location || "",
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
      email: user.email || cached.email || "",
      phoneNumber: user.phoneNumber || cached.phoneNumber || cached.phone || "",
      phone: user.phone || cached.phoneNumber || cached.phone || "",
      location: user.location || cached.location || cached.address || "",
      address: user.address || cached.location || cached.address || "",
      avatarUrl: user.avatarUrl || cached.avatarUrl || "",
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
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { response: { data } };
    return data;
  },

  logout() {
    clearAuthStorage();
    window.dispatchEvent(new Event("auth-change"));
  },
};
