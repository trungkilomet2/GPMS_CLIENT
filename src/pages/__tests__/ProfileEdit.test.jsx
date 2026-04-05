import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfileEdit from "@/pages/profile/ProfileEdit";
import { userService } from "@/services/UserService";
import { authService } from "@/services/authService";
import { locationService } from "@/services/locationService";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/components/Header", () => ({
  default: () => <div data-testid="header-stub" />,
}));

vi.mock("@/services/UserService", () => ({
  userService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock("@/services/authService", () => ({
  authService: {
    sendRegisterOtp: vi.fn(),
    resendRegisterOtp: vi.fn(),
    verifyRegisterOtp: vi.fn(),
  },
}));

vi.mock("@/services/locationService", () => ({
  locationService: {
    getProvinces: vi.fn(),
    getWardsByProvinceCode: vi.fn(),
  },
}));

const baseStoredUser = {
  id: 7,
  userId: 7,
  fullName: "Nguyen Thanh Trung",
  name: "Nguyen Thanh Trung",
  email: "trungkilo123@gmail.com",
  phoneNumber: "0332065662",
  phone: "0332065662",
  location: "Ha Noi",
  address: "Ha Noi",
  avatarUrl: "https://example.com/avatar.png",
};

const baseProfile = {
  ...baseStoredUser,
  emailFromServer: true,
  emailVerified: true,
  bio: "",
  cooperationNotes: [],
};

function seedStoredUser(user = baseStoredUser) {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("userId", String(user.userId));
  localStorage.setItem("token", "fake-token");
}

async function renderPage() {
  const view = render(
    <MemoryRouter>
      <ProfileEdit />
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(view.container.querySelector('input[name="FullName"]')).toBeTruthy();
  });

  return view;
}

describe("ProfileEdit", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mockNavigate.mockReset();
    seedStoredUser();
    userService.getProfile.mockResolvedValue(baseProfile);
    locationService.getProvinces.mockResolvedValue([
      { code: 1, name: "Ha Noi" },
      { code: 79, name: "TP Ho Chi Minh" },
    ]);
    locationService.getWardsByProvinceCode.mockResolvedValue([
      { code: 1001, name: "Phuong Ben Nghe" },
      { code: 1002, name: "Phuong Da Kao" },
    ]);
  });

  it("saves profile successfully and redirects to /profile", async () => {
    userService.updateProfile.mockResolvedValue({ otpRequired: false, data: {} });

    const { container } = await renderPage();

    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(userService.updateProfile).toHaveBeenCalledTimes(1);
    });

    expect(authService.sendRegisterOtp).not.toHaveBeenCalled();
    expect(userService.getProfile).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Lưu hồ sơ thành công!/i)).toBeInTheDocument();

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith("/profile", {
          state: { refresh: expect.any(Number) },
        });
      },
      { timeout: 2500 }
    );
  });

  it("blocks save when email changed but OTP has not been verified", async () => {
    const { container } = await renderPage();

    fireEvent.change(container.querySelector('input[name="Email"]'), {
      target: { value: "newmail@example.com" },
    });

    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(screen.getByText(/Vui lòng xác minh email hiện tại bằng mã OTP trước khi lưu hồ sơ\./i)).toBeInTheDocument();
    });

    expect(userService.updateProfile).not.toHaveBeenCalled();
    expect(authService.sendRegisterOtp).not.toHaveBeenCalled();
  });

  it("shows a friendly message when backend returns a generic entity save error", async () => {
    userService.updateProfile.mockRejectedValue({
      response: {
        data: {
          status: 500,
          detail: "An error occurred while saving the entity changes. See the inner exception for details.",
        },
      },
    });

    const { container } = await renderPage();

    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(
        screen.getByText(/Không thể lưu hồ sơ do backend trả lỗi nội bộ chung chung\./i)
      ).toBeInTheDocument();
    });

    expect(userService.updateProfile).toHaveBeenCalledTimes(1);
  });

  it("shows verified email status when profile data says the email was already verified", async () => {
    await renderPage();

    expect(screen.getByText("Đã xác minh")).toBeInTheDocument();
    expect(
      screen.getByText(/Email hiện tại đã được xác minh\. Bạn có thể lưu thay đổi hồ sơ\./i)
    ).toBeInTheDocument();
  });

  it("treats 'already verified' as a successful OTP verification on profile edit", async () => {
    authService.verifyRegisterOtp.mockRejectedValue({
      response: {
        data: {
          message: "Email đã được xác thực trước đó",
        },
      },
    });

    const { container } = await renderPage();

    fireEvent.change(container.querySelector('input[name="Email"]'), {
      target: { value: "newmail@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nhập mã OTP"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Xác minh" }));

    await waitFor(() => {
      expect(screen.getByText("Đã xác minh")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Email hiện tại đã được xác minh\. Bạn có thể lưu thay đổi hồ sơ\./i)
    ).toBeInTheDocument();
  });

  it("falls back to resend OTP when the email is already registered", async () => {
    authService.sendRegisterOtp.mockRejectedValue({
      response: {
        data: {
          message: "Email đã được đăng ký",
        },
      },
    });
    authService.resendRegisterOtp.mockResolvedValue({ message: "otp-sent" });

    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Gửi lại OTP" }));

    await waitFor(() => {
      expect(authService.sendRegisterOtp).toHaveBeenCalledTimes(1);
      expect(authService.resendRegisterOtp).toHaveBeenCalledTimes(1);
      expect(screen.getByPlaceholderText("Nhập mã OTP")).toBeInTheDocument();
    });
  });

  it("loads province options and lets the user pick a ward", async () => {
    const { container } = await renderPage();
    const selects = container.querySelectorAll("select");

    fireEvent.change(selects[0], { target: { value: "79" } });

    await waitFor(() => {
      expect(locationService.getWardsByProvinceCode).toHaveBeenCalledWith("79");
    });

    fireEvent.change(selects[1], { target: { value: "1001" } });

    expect(screen.getByText(/Khu vực đã chọn:/i)).toHaveTextContent("Phuong Ben Nghe, TP Ho Chi Minh");
  });
});
