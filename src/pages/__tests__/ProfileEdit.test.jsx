import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfileEdit from "@/pages/profile/ProfileEdit";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";

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

vi.mock("@/services/userService", () => ({
  userService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock("@/services/authService", () => ({
  authService: {
    sendRegisterOtp: vi.fn(),
    verifyRegisterOtp: vi.fn(),
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
  });

  it("saves profile successfully and redirects to /profile", async () => {
    userService.updateProfile.mockResolvedValue({ otpRequired: false, data: {} });

    const { container } = await renderPage();

    fireEvent.change(container.querySelector('textarea[name="Bio"]'), {
      target: { value: "Khach hang uu tien chat luong." },
    });

    fireEvent.change(container.querySelector('textarea[name="CooperationNotes"]'), {
      target: { value: "Cap nhat tien do hang tuan" },
    });

    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(userService.updateProfile).toHaveBeenCalledTimes(1);
    });

    expect(authService.sendRegisterOtp).not.toHaveBeenCalled();
    expect(userService.getProfile).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Lưu hồ sơ thành công!/i)).toBeInTheDocument();

    const savedUser = JSON.parse(localStorage.getItem("user"));
    expect(savedUser.bio).toBe("Khach hang uu tien chat luong.");
    expect(savedUser.cooperationNotes).toEqual(["Cap nhat tien do hang tuan"]);

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
});
