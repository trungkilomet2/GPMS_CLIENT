import WorkerService from "@/services/WorkerService";
import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";
import { getAuthItem, getStoredUser } from "@/lib/authStorage";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("@/lib/authStorage", () => ({
  getAuthItem: vi.fn(),
  getStoredUser: vi.fn(),
}));

describe("WorkerService.assignWorkerSkill", () => {
  it("sends numeric skillIds to assign-worker-skill endpoint", async () => {
    axiosClient.put.mockResolvedValue({ data: "ok" });

    const result = await WorkerService.assignWorkerSkill(7, ["1", 2, "3"]);

    expect(axiosClient.put).toHaveBeenCalledWith(
      API_ENDPOINTS.WORKER.ASSIGN_WORKER_SKILL(7),
      { skillIds: [1, 2, 3] }
    );
    expect(result).toEqual({ data: "ok" });
  });

  it("allows clearing all worker skills by sending an empty array", async () => {
    axiosClient.put.mockResolvedValue({ data: "ok" });

    const result = await WorkerService.assignWorkerSkill(7, []);

    expect(axiosClient.put).toHaveBeenCalledWith(
      API_ENDPOINTS.WORKER.ASSIGN_WORKER_SKILL(7),
      { skillIds: [] }
    );
    expect(result).toEqual({ data: "ok" });
  });
});

describe("WorkerService.getManagerDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStoredUser.mockReturnValue(null);
  });

  it("loads managers from worker employee directory so managerId matches worker module ids", async () => {
    axiosClient.get.mockResolvedValue({
      data: [
        {
          id: 11,
          userName: "owner01",
          fullName: "Chu xuong A",
          role: "Owner",
        },
        {
          id: 12,
          userName: "pm01",
          fullName: "Quan ly A",
          role: "PM",
        },
      ],
      recordCount: 2,
    });

    const result = await WorkerService.getManagerDirectory({ pageSize: 100 });

    expect(axiosClient.get).toHaveBeenCalledWith(
      API_ENDPOINTS.WORKER.GET_ALL_EMPLOYEES,
      {
        params: {
          PageIndex: 0,
          PageSize: 100,
          SortColumn: "Name",
          SortOrder: "ASC",
        },
      }
    );
    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: 11,
          fullName: "Chu xuong A",
          primarySystemRole: "Owner",
        }),
        expect.objectContaining({
          id: 12,
          fullName: "Quan ly A",
          primarySystemRole: "PM",
        }),
      ],
      pageIndex: 0,
      pageSize: 2,
      recordCount: 2,
    });
  });

  it("injects the logged-in owner into manager options when employee directory does not include owner", async () => {
    getStoredUser.mockReturnValue({
      userId: 7,
      userName: "hungchuxuong",
      fullName: "Tung Tong Tai",
      role: "Owner",
    });
    axiosClient.get.mockResolvedValue({
      data: [
        {
          id: 12,
          userName: "pm01",
          fullName: "Quan ly A",
          role: "PM",
        },
      ],
      recordCount: 1,
    });

    const result = await WorkerService.getManagerDirectory({ pageSize: 100 });

    expect(result.data).toEqual([
      expect.objectContaining({
        id: 7,
        userName: "hungchuxuong",
        fullName: "Tung Tong Tai",
        primarySystemRole: "Owner",
      }),
      expect.objectContaining({
        id: 12,
        userName: "pm01",
        primarySystemRole: "PM",
      }),
    ]);
  });
});

describe("WorkerService.createEmployee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthItem.mockReturnValue("test-token");
    getStoredUser.mockReturnValue(null);
  });

  it("submits create-employee with Swagger-compatible headers and normalized numeric payload", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("Nhân viên có Id: '8' được tạo thành công"),
    });

    const result = await WorkerService.createEmployee({
      userName: "  pmnew01  ",
      password: "123456",
      fullName: "  Quan ly moi  ",
      managerId: "2",
      roleIds: ["4"],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      API_ENDPOINTS.WORKER.CREATE,
      expect.objectContaining({
        method: "POST",
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          userName: "pmnew01",
          password: "123456",
          fullName: "Quan ly moi",
          managerId: 2,
          roleIds: [4],
        }),
      })
    );
    expect(result).toEqual({
      data: "Nhân viên có Id: '8' được tạo thành công",
    });
  });

  it("surfaces a clear error when worker create endpoint returns 404", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue(""),
    });

    await expect(
      WorkerService.createEmployee({
        userName: "pmnew01",
        password: "123456",
        fullName: "Quan ly moi",
        managerId: 7,
        roleIds: [4],
      })
    ).rejects.toMatchObject({
      response: {
        status: 404,
        data: expect.objectContaining({
          message: expect.stringContaining("/api/Worker/create-employee"),
        }),
      },
    });
  });
});
