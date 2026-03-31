import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import { authService } from "@/services/authService";

vi.mock("@/services/authService", () => ({
  authService: {
    requestPasswordReset: vi.fn(),
  },
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows validation error when email is invalid", async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Nhập email của bạn"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi hướng dẫn khôi phục" }));

    await waitFor(() => {
      expect(screen.getByText("Email không hợp lệ")).toBeInTheDocument();
    });
  });

  it("shows mock success message after submit", async () => {
    authService.requestPasswordReset.mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Nhập email của bạn"), {
      target: { value: "tester@mail.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi hướng dẫn khôi phục" }));

    await waitFor(() => {
      expect(screen.getByText("Kiểm tra email của bạn")).toBeInTheDocument();
    });

    expect(authService.requestPasswordReset).toHaveBeenCalledWith({ email: "tester@mail.com" });
    expect(screen.getByText(/Chúng tôi đã tiếp nhận yêu cầu khôi phục mật khẩu/i)).toBeInTheDocument();
  });

  it("shows submit error when service fails", async () => {
    authService.requestPasswordReset.mockRejectedValue({
      response: {
        data: {
          message: "Không thể gửi yêu cầu lúc này",
        },
      },
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Nhập email của bạn"), {
      target: { value: "tester@mail.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi hướng dẫn khôi phục" }));

    await waitFor(() => {
      expect(screen.getByText("Không thể gửi yêu cầu lúc này")).toBeInTheDocument();
    });
  });
});
