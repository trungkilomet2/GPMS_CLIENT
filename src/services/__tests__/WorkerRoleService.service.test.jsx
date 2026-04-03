import WorkerRoleService from "@/services/WorkerRoleService";
import WorkerService from "@/services/WorkerService";
import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("@/services/WorkerService", () => ({
  default: {
    getEmployeeDirectory: vi.fn(),
  },
}));

describe("WorkerRoleService.getWorkerRoles", () => {
  it("counts employees across all assigned specialties instead of only the first one", async () => {
    axiosClient.get.mockResolvedValue({
      data: [
        { id: 1, name: "Cat" },
        { id: 2, name: "May" },
        { id: 3, name: "Va" },
      ],
      recordCount: 3,
    });
    WorkerService.getEmployeeDirectory.mockResolvedValue({
      data: [
        {
          id: 101,
          fullName: "Tùng Thợ Cắt",
          userName: "tungcat",
          workerSkillNames: ["Cat", "May", "Va"],
        },
        {
          id: 102,
          fullName: "Tùng Thợ May 2",
          userName: "tungmay2",
          workerSkillNames: ["Cat", "May"],
        },
      ],
    });

    const roles = await WorkerRoleService.getWorkerRoles();

    expect(axiosClient.get).toHaveBeenCalledWith(API_ENDPOINTS.WORKER_ROLE.GET_ALL, {
      params: {
        PageIndex: 0,
        PageSize: 100,
        SortColumn: "Name",
        SortOrder: "ASC",
      },
    });

    expect(roles.find((role) => role.name === "Cat")).toMatchObject({
      assignedCount: 2,
      members: [
        { id: 101, fullName: "Tùng Thợ Cắt", userName: "tungcat" },
        { id: 102, fullName: "Tùng Thợ May 2", userName: "tungmay2" },
      ],
    });
    expect(roles.find((role) => role.name === "May")).toMatchObject({
      assignedCount: 2,
      members: [
        { id: 101, fullName: "Tùng Thợ Cắt", userName: "tungcat" },
        { id: 102, fullName: "Tùng Thợ May 2", userName: "tungmay2" },
      ],
    });
    expect(roles.find((role) => role.name === "Va")).toMatchObject({
      assignedCount: 1,
      members: [{ id: 101, fullName: "Tùng Thợ Cắt", userName: "tungcat" }],
    });
  });
});
