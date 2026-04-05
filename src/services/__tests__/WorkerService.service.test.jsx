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
