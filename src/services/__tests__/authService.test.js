import { authService } from '@/services/authService';
import { API_ENDPOINTS } from "@/lib/apiconfig";

describe("authService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("register sends the expected payload and returns parsed response", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "application/json",
      },
      json: async () => ({ success: true, message: "registered" }),
    });

    const result = await authService.register({
      fullName: "Tester",
      userName: "tester01",
      email: "t@mail.com",
      password: "123456",
      rePassword: "123456",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      API_ENDPOINTS.ACCOUNT.REGISTER,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: "tester01",
          fullName: "Tester",
          password: "123456",
          rePassword: "123456",
          email: "t@mail.com",
        }),
      })
    );
    expect(result).toEqual({ success: true, message: "registered" });
  });

  it("sendRegisterOtp and resendRegisterOtp call the correct email endpoints", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "application/json",
      },
      json: async () => ({ success: true }),
    });

    await authService.sendRegisterOtp({ email: "otp@mail.com" });
    await authService.resendRegisterOtp({ email: "otp@mail.com" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.EMAIL.SEND_OTP,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "otp@mail.com" }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      API_ENDPOINTS.EMAIL.RESEND_OTP,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "otp@mail.com" }),
      })
    );
  });

  it("logout clears auth storage and dispatches auth-change", () => {
    const eventSpy = vi.spyOn(window, "dispatchEvent");
    localStorage.setItem("token", "abc");
    localStorage.setItem("user", JSON.stringify({ id: 1 }));
    localStorage.setItem("userId", "1");

    authService.logout();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("userId")).toBeNull();
    expect(eventSpy).toHaveBeenCalled();
  });
});
