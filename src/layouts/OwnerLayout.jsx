import { getStoredUser } from "@/lib/authStorage";
import { extractRoleValue } from "@/lib/authIdentity";
import DashboardLayout from "@/layouts/DashboardLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import MainLayout from "@/layouts/MainLayout";

function splitRoles(value) {
  const normalizeRoleItem = (item) => {
    if (item == null) return "";
    if (typeof item === "string" || typeof item === "number") return String(item).trim();
    if (typeof item === "object") return String(item.name ?? item.role ?? item.roleName ?? item.value ?? item.label ?? "").trim();
    return "";
  };

  if (Array.isArray(value)) return value.map(normalizeRoleItem).filter(Boolean);

  if (value && typeof value === "object") return [normalizeRoleItem(value)].filter(Boolean);

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function OwnerLayout({ children }) {
  const user = getStoredUser();
  // Some API responses store roles as objects in `roles`, not a string in `role`.
  const roleValue = extractRoleValue(user) || user?.role || user?.roles || "";
  const roles = splitRoles(roleValue).map((role) => role.toLowerCase());

  if (roles.includes("owner") || roles.includes("pm") || roles.includes("project manager")) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  if (roles.includes("worker") || roles.includes("sewer") || roles.includes("tailor")) {
    return <WorkerLayout>{children}</WorkerLayout>;
  }

  return <MainLayout>{children}</MainLayout>;
}
