import {
  getPrimaryWorkspaceRole,
  hasAnyRole,
  splitRoles,
} from "@/lib/internalRoleFlow";

export { hasAnyRole, splitRoles };

export function getDefaultRouteForRole(roleValue) {
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
      return "/production-plan/assign";
    case "worker":
      return "/worker/assignments";
    default:
      return "/home";
  }
}

export function canManageLeaveRequests(roleValue) {
  return hasAnyRole(roleValue, ["owner", "pm"]);
}
