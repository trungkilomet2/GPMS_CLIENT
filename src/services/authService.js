// src/services/authService.js

export const authService = {
  async login(payload) {
    console.log("Login payload:", payload);

    // TODO: thay bằng API call thật
    // const res = await axios.post("/api/auth/login", payload);
    // const { user, token } = res.data;

    const user = {
      id:        "u001",
      name:      payload.loginId,   // hoặc res.data.fullName
      email:     payload.loginId,
      avatarUrl: null,
      role:      "customer",
    };

    // Lưu vào localStorage
    localStorage.setItem("user", JSON.stringify(user));

    // Thông báo cho Header re-render
    window.dispatchEvent(new Event("auth-change"));

    return { success: true, message: "Đăng nhập thành công", data: user };
  },

  async register(payload) {
    console.log("Register payload:", payload);

    // TODO: thay bằng API call thật
    const user = {
      id:        "u002",
      name:      payload.fullName ?? payload.loginId,
      email:     payload.email ?? payload.loginId,
      avatarUrl: null,
      role:      "customer",
    };

    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(new Event("auth-change"));

    return { success: true, message: "Đăng ký thành công", data: user };
  },

  logout() {
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth-change"));
  },
};