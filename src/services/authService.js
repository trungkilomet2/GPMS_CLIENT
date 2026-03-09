// src/services/authService.js

export const authService = {
  async login(payload) {
    console.log("Login payload:", payload);

    // TODO: replace with real API call
    // const res = await axios.post("/api/auth/login", payload);
    // const { user, token } = res.data;

    const loginId = payload.userName ?? payload.loginId ?? "";

    const user = {
      id: "u001",
      name: loginId,
      email: loginId,
      avatarUrl: null,
      role: "customer",
    };

    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(new Event("auth-change"));

    return { success: true, message: "Dang nhap thanh cong", data: user, user };
  },

  async register(payload) {
    console.log("Register payload:", payload);

    // TODO: replace with real API call
    const user = {
      id: "u002",
      name: payload.fullName ?? payload.loginId,
      email: payload.email ?? payload.loginId,
      avatarUrl: null,
      role: "customer",
    };

    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(new Event("auth-change"));

    return { success: true, message: "Dang ky thanh cong", data: user };
  },

  logout() {
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth-change"));
  },
};
