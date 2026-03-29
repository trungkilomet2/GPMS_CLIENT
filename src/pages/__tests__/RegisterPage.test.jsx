import { fireEvent, render, waitFor } from '@testing-library/react';
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RegisterPage from "@/pages/RegisterPage";
import { authService } from "@/services/authService";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/services/authService", () => ({
  authService: {
    sendRegisterOtp: vi.fn(),
    resendRegisterOtp: vi.fn(),
    verifyRegisterOtp: vi.fn(),
    register: vi.fn(),
  },
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("sends OTP first, then verifies OTP and registers successfully", async () => {
    authService.sendRegisterOtp.mockResolvedValue({ message: "otp-sent" });
    authService.verifyRegisterOtp.mockResolvedValue({ message: "verified" });
    authService.register.mockResolvedValue({ message: "ok" });

    const { container } = render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="fullName"]'), { target: { value: "Nguyen Van A" } });
    fireEvent.change(container.querySelector('input[name="email"]'), { target: { value: "nva@example.com" } });
    fireEvent.change(container.querySelector('input[name="userName"]'), { target: { value: "nva123" } });
    fireEvent.change(container.querySelector('input[name="password"]'), { target: { value: "123456" } });
    fireEvent.change(container.querySelector('input[name="confirmPassword"]'), { target: { value: "123456" } });
    fireEvent.click(container.querySelector('input[name="agree"]'));

    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(authService.sendRegisterOtp).toHaveBeenCalledWith({
        email: "nva@example.com",
      });
    });

    expect(authService.verifyRegisterOtp).not.toHaveBeenCalled();
    expect(authService.register).not.toHaveBeenCalled();
    expect(container.querySelector('input[name="otp"]')).toBeTruthy();

    fireEvent.change(container.querySelector('input[name="otp"]'), { target: { value: "123456" } });
    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(authService.verifyRegisterOtp).toHaveBeenCalledWith({
        email: "nva@example.com",
        otp: "123456",
      });
    });

    expect(authService.register).toHaveBeenCalledWith({
      fullName: "Nguyen Van A",
      email: "nva@example.com",
      userName: "nva123",
      password: "123456",
      rePassword: "123456",
    });

    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByText("Đăng nhập ngay"));
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("does not send OTP when required fields or terms are missing", async () => {
    const { container } = render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(authService.sendRegisterOtp).not.toHaveBeenCalled();
      expect(authService.verifyRegisterOtp).not.toHaveBeenCalled();
      expect(authService.register).not.toHaveBeenCalled();
    });
  });
});
