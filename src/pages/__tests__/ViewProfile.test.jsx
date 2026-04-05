import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ViewProfile from "@/pages/profile/ViewProfile";
import { userService } from "@/services/UserService";
import OrderService from "@/services/OrderService";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/components/Header", () => ({
  default: () => <div>Header</div>,
}));

vi.mock("@/services/UserService", () => ({
  userService: {
    getProfile: vi.fn(),
  },
}));

vi.mock("@/services/OrderService", () => ({
  default: {
    getOrdersByUser: vi.fn(),
  },
}));

describe("ViewProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("token", "test-token");
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: 5,
        userId: 5,
        fullName: "Tran Van B",
        email: "b@test.com",
        role: "Customer",
      })
    );
  });

  it("loads profile from API and switches to security tab", async () => {
    userService.getProfile.mockResolvedValue({
      id: 5,
      userId: 5,
      fullName: "Tran Van B",
      email: "b@test.com",
      role: "Customer",
    });
    OrderService.getOrdersByUser.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <ViewProfile />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Tran Van B").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /bảo mật/i }));

    expect(screen.getByText(/đổi mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nhập mật khẩu hiện tại")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nhập mật khẩu mới")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nhập lại mật khẩu mới")).toBeInTheDocument();
  });
});
