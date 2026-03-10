import { API_ENDPOINTS } from "@/lib/apiconfig";

export const authService = {

  async login(payload) {
    const res = await fetch(API_ENDPOINTS.ACCOUNT.LOGIN, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        userName: payload.userName,
        password: payload.password,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { response: { data: err } };
    }

    // Backend trả về token string thuần
    const token = await res.text();
    localStorage.setItem("token", token);

    // Decode JWT để lấy thông tin
    const base64  = token.split(".")[1];
    const decoded = JSON.parse(atob(base64));

    const userName = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ?? "";
    const role     = decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? "";
    // Lấy userId từ claim "sub" hoặc "nameid"
    const userId   =
      decoded["sub"] ??
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
      decoded["userId"] ??
      null;

    const user = { userId, userName, role };
    localStorage.setItem("user",   JSON.stringify(user));
    localStorage.setItem("userId", String(userId ?? ""));

    window.dispatchEvent(new Event("auth-change"));

    return { token, user };
  },

  async register(payload) {
    const res = await fetch(API_ENDPOINTS.ACCOUNT.REGISTER, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        userName:   payload.userName,
        fullName:   payload.fullName,
        password:   payload.password,
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