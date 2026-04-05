import {
  getPrimaryWorkspaceRole,
  hasAnyRole,
  splitRoles,
} from "@/lib/internalRoleFlow";

export { hasAnyRole, splitRoles };

export function getPostLoginPath(roleValue) {
  const roles = Array.isArray(roleValue) ? roleValue : splitRoles(roleValue);
  const primaryRole = getPrimaryWorkspaceRole(roles);

  switch (primaryRole) {
    case "admin":
      return "/admin/users";
    case "owner":
      return "/dashboard";
    case "pm":
      return "/production";
    case "teamLeader":
      return "/production-plan";
    case "manager":
      return "/worker/assignments";
    case "kcs":
      return "/worker/daily-report";
    case "worker":
      return "/worker/production-plan";
    case "customer":
      return "/orders";
    default:
      return hasAnyRole(roles, ["customer"]) ? "/orders" : "/home";
  }
}
