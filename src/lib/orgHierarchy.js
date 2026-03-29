export const SYSTEM_ROLE_IDS = {
  Admin: 1,
  Customer: 2,
  Owner: 3,
  PM: 4,
  Worker: 5,
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
  "Worker",
  "Admin",
  "Customer",
];

export const SYSTEM_ROLE_LABELS = {
  Admin: "Quản trị viên",
  Customer: "Khách hàng",
  Owner: "Chủ xưởng",
  PM: "Quản lý sản xuất",
  Worker: "Nhân viên",
};

export const EMPLOYEE_FORM_ROLE_OPTIONS = [
  { value: "Owner", label: "Chủ xưởng" },
  { value: "PM", label: "Quản lý sản xuất" },
  { value: "Worker", label: "Nhân viên" },
];

export const EMPLOYEE_CREATE_ROLE_OPTIONS = EMPLOYEE_FORM_ROLE_OPTIONS.filter(
  (roleOption) => roleOption.value !== "Owner"
);

export const WORKER_SKILL_LABELS = {
  Cat: "Cắt",
  Cắt: "Cắt",
  May: "May",
  Va: "Vá",
  Vá: "Vá",
  "Kiem Hang": "Kiểm Hàng",
  "Kiểm Hàng": "Kiểm Hàng",
};

export const INTERNAL_PROJECT_ROLES = new Set([
  "admin",
  "customer",
  "owner",
  "pm",
  "worker",
]);

const SYSTEM_ROLE_ALIASES = {
  admin: "Admin",
  customer: "Customer",
  owner: "Owner",
  pm: "PM",
  "project manager": "PM",
  worker: "Worker",
};

export function normalizeSystemRoleName(role = "") {
  const normalized = String(role ?? "").trim().toLowerCase();
  return SYSTEM_ROLE_ALIASES[normalized] ?? String(role ?? "").trim();
}

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
      .filter(Boolean)
      .map(normalizeSystemRoleName);
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeSystemRoleName);
}

export function getSystemRoleLabel(role = "") {
  const normalizedRole = normalizeSystemRoleName(role);
  return SYSTEM_ROLE_LABELS[normalizedRole] ?? normalizedRole;
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
  const roles = splitRoles(roleValue).map(normalizeSystemRoleName);
  for (const role of SYSTEM_ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return roles[0] ?? "";
}

export function getManagerRoleHint(role = "") {
  switch (normalizeSystemRoleName(role)) {
    case "Owner":
      return "Không có cấp quản lý trực tiếp trong mô hình 1 xưởng.";
    case "PM":
      return "Báo cáo trực tiếp cho Owner.";
    case "Worker":
      return "Báo cáo trực tiếp cho PM phụ trách.";
    default:
      return "Chưa xác định tuyến quản lý trực tiếp.";
  }
}

export function getAllowedManagerRoles(role = "") {
  switch (normalizeSystemRoleName(role)) {
    case "Owner":
      return [];
    case "PM":
      return ["Owner"];
    case "Worker":
      return ["PM"];
    default:
      return [];
  }
}

export function isManagerRequired(role = "") {
  return getAllowedManagerRoles(role).length > 0;
}

export function getRoleHierarchyTag(role = "") {
  switch (normalizeSystemRoleName(role)) {
    case "Owner":
      return "Cấp owner";
    case "PM":
      return "Cấp quản lý sản xuất";
    case "Worker":
      return "Cấp tác nghiệp";
    default:
      return "Chưa phân loại";
  }
}
