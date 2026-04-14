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

  it("login stores token and user info when backend returns a base64url JWT", async () => {
    const jwtPayload = {
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": "tester01",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": "15",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Customer",
      fullName: "Tester One",
    };

    const encodedPayload = btoa(JSON.stringify(jwtPayload))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const token = `header.${encodedPayload}.signature`;

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        text: async () => token,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            userId: "15",
            fullName: "Tester One",
            email: "tester@mail.com",
            role: "Customer",
          },
        }),
      });

    const result = await authService.login({
      userName: "tester01",
      password: "123456",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.ACCOUNT.LOGIN,
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(localStorage.getItem("token")).toBe(token);
    expect(localStorage.getItem("userId")).toBe("15");
    expect(JSON.parse(localStorage.getItem("user"))).toEqual(
      expect.objectContaining({
        userId: "15",
        fullName: "Tester One",
        role: "Customer",
      })
    );
    expect(result.token).toBe(token);
  });
});
