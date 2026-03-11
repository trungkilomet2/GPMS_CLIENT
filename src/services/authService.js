import { API_ENDPOINTS } from "@/lib/apiconfig";

async function loadProfileAfterLogin(token) {
  try {
    const res = await fetch(API_ENDPOINTS.USER.VIEW_PROFILE, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const json = await res.json().catch(() => ({}));
    const d = json?.data ?? {};

    return {
      fullName: d.fullName || "",
      name: d.fullName || "",
      email: d.email || "",
      phoneNumber: d.phoneNumber || "",
      phone: d.phoneNumber || "",
      avatarUrl: d.avartarUrl || "",
      location: d.location || "",
      address: d.location || "",
    };
  } catch {
    return null;
  }
}

export const authService = {
  async login(payload) {
    const res = await fetch(API_ENDPOINTS.ACCOUNT.LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: payload.userName,
        password: payload.password,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { response: { data: err } };
    }

    const rawToken = await res.text();
    const token = rawToken.replace(/^"|"$/g, "").trim();

    localStorage.setItem("token", token);

    const payload64 = token.split(".")[1];
    const decoded = JSON.parse(atob(payload64));

    const userName =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ??
      "";

    const fullName =
      decoded["fullName"] ??
      decoded["name"] ??
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"] ??
      userName;

    const role =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
      "";

    const userId =
      decoded[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ] ?? "";

    const basicUser = {
      userId,
      userName,
      name: fullName || userName,
      fullName: fullName || userName,
      role,
      avatarUrl: "",
    };

    const profile = await loadProfileAfterLogin(token);
    const user = {
      ...basicUser,
      ...(profile ?? {}),
      name: profile?.fullName || profile?.name || basicUser.name,
      fullName: profile?.fullName || basicUser.fullName,
      avatarUrl: profile?.avatarUrl || basicUser.avatarUrl,
    };

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("userId", userId);

    window.dispatchEvent(new Event("auth-change"));

    return { token, user };
  },

  async register(payload) {
    const res = await fetch(API_ENDPOINTS.ACCOUNT.REGISTER, {
      method: "POST",
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
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth-change"));
  },
};
