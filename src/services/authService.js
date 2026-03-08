// src/services/authService.js
export const authService = {
  async login(payload) {
    console.log("Login payload:", payload);
    return {
      success: true,
      message: "Đăng nhập thành công",
      data: {
        username: payload.loginId,
      },
    };
  },

  async register(payload) {
    console.log("Register payload:", payload);
    return {
      success: true,
      message: "Đăng ký thành công",
      data: payload,
    };
  },
};