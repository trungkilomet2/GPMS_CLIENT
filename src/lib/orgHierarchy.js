export const SYSTEM_ROLE_IDS = {
  Admin: 1,
  Customer: 2,
  Owner: 3,
  PM: 4,
  "Team Leader": 5,
  Worker: 6,
  KCS: 7,
};

export const USER_STATUS_IDS = {
  Active: 1,
  Inactive: 2,
  active: 1,
  inactive: 2,
};

export const SYSTEM_ROLE_PRIORITY = [
  "Owner",
  "PM",
  "Team Leader",
  "KCS",
  "Worker",
  "Admin",
  "Customer",
];

export const SYSTEM_ROLE_LABELS = {
  Admin: "Quản trị viên",
  Customer: "Khách hàng",
  Owner: "Chủ xưởng",
  PM: "Quản lý sản xuất",
  "Team Leader": "Tổ trưởng",
  Worker: "Nhân viên",
  KCS: "Kiểm soát chất lượng",
};

export const EMPLOYEE_FORM_ROLE_OPTIONS = [
  { value: "Owner", label: "Chủ xưởng" },
  { value: "PM", label: "Quản lý sản xuất" },
  { value: "Team Leader", label: "Tổ trưởng" },
  { value: "Worker", label: "Nhân viên" },
  { value: "KCS", label: "Kiểm soát chất lượng" },
];

export const WORKER_SKILL_LABELS = {
  Tailor: "Thợ may",
  "Quality Control": "Kiểm tra chất lượng",
};

export const INTERNAL_PROJECT_ROLES = new Set([
  "admin",
  "customer",
  "owner",
  "pm",
  "team leader",
  "teamleader",
  "tl",
  "worker",
  "kcs",
]);

export function splitRoles(value = "") {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string" || typeof item === "number") return String(item).trim();
        if (typeof item === "object") {
          return String(item.name ?? item.role ?? item.roleName ?? item.value ?? item.label ?? "").trim();
        }
        return "";
      })
      .filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getSystemRoleLabel(role = "") {
  return SYSTEM_ROLE_LABELS[role] ?? role;
}

export function getWorkerSkillLabel(skill = "") {
  return WORKER_SKILL_LABELS[skill] ?? skill;
}

export function isWorkerSkillName(name = "") {
  const normalized = String(name ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return !INTERNAL_PROJECT_ROLES.has(normalized);
}

export function pickPrimarySystemRole(roleValue = "") {
  const roles = splitRoles(roleValue);
  for (const role of SYSTEM_ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return roles[0] ?? "";
}

export function getManagerRoleHint(role = "") {
  switch (role) {
    case "Owner":
      return "Không có cấp quản lý trực tiếp trong mô hình 1 xưởng.";
    case "PM":
      return "Báo cáo trực tiếp cho Owner.";
    case "Team Leader":
      return "Thuộc phạm vi quản lý của một PM.";
    case "Worker":
      return "Thuộc team của Team Lead hoặc PM phụ trách line.";
    case "KCS":
      return "Thường phối hợp với Owner hoặc PM tùy quy trình xưởng.";
    default:
      return "Chưa xác định tuyến quản lý trực tiếp.";
  }
}

export function getAllowedManagerRoles(role = "") {
  switch (role) {
    case "Owner":
      return [];
    case "PM":
      return ["Owner"];
    case "Team Leader":
      return ["PM"];
    case "Worker":
      return ["Team Leader", "PM"];
    case "KCS":
      return ["Owner", "PM"];
    default:
      return [];
  }
}

export function isManagerRequired(role = "") {
  return getAllowedManagerRoles(role).length > 0;
}

export function getRoleHierarchyTag(role = "") {
  switch (role) {
    case "Owner":
      return "Cấp owner";
    case "PM":
      return "Cấp quản lý sản xuất";
    case "Team Leader":
      return "Cấp tổ/chuyền";
    case "Worker":
      return "Cấp tác nghiệp";
    case "KCS":
      return "Cấp kiểm soát";
    default:
      return "Chưa phân loại";
  }
}
