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
      return "/production-plan/assign";
    case "worker":
      return "/worker/assignments";
    default:
      return hasAnyRole(roles, ["customer"]) ? "/home" : "/home";
  }
}
