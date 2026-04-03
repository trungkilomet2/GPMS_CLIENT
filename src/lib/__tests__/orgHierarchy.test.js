import {
  canAssignSpecialties,
  canManageRole,
  getDirectManagerRoleLabel,
  getManagerRoleHint,
  isEligibleDirectManager,
} from "@/lib/orgHierarchy";

describe("orgHierarchy direct manager rules", () => {
  it("allows only Owner to manage PM", () => {
    expect(canManageRole("Owner", "PM")).toBe(true);
    expect(canManageRole("PM", "PM")).toBe(false);
    expect(canManageRole("Worker", "PM")).toBe(false);
  });

  it("allows only PM to manage Worker based on primary system role", () => {
    expect(
      isEligibleDirectManager(
        { primarySystemRole: "PM", roles: ["Owner", "PM"] },
        "Worker"
      )
    ).toBe(true);

    expect(
      isEligibleDirectManager(
        { primarySystemRole: "Owner", roles: ["Owner", "PM"] },
        "Worker"
      )
    ).toBe(false);
  });

  it("does not treat an Admin account with extra Owner role as the factory owner", () => {
    expect(
      isEligibleDirectManager(
        { roles: ["Admin", "Owner", "PM", "Worker"] },
        "PM"
      )
    ).toBe(false);
  });

  it("returns Vietnamese labels and hints for the valid direct manager chain", () => {
    expect(getManagerRoleHint("PM")).toBe("Báo cáo trực tiếp cho Chủ xưởng.");
    expect(getManagerRoleHint("Worker")).toBe("Báo cáo trực tiếp cho Quản lý sản xuất phụ trách.");
    expect(
      getDirectManagerRoleLabel({ roles: ["Owner", "PM"] }, "PM")
    ).toBe("Chủ xưởng");
    expect(
      getDirectManagerRoleLabel({ roles: ["Owner", "PM"] }, "Worker")
    ).toBe("Quản lý sản xuất");
  });

  it("allows specialty assignment for PM and Worker only", () => {
    expect(canAssignSpecialties(["PM"])).toBe(true);
    expect(canAssignSpecialties(["Worker"])).toBe(true);
    expect(canAssignSpecialties(["Owner"])).toBe(false);
  });
});
