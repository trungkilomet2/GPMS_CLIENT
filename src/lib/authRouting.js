export function splitRoles(value) {
  const normalizeRoleItem = (item) => {
    if (item == null) return "";
    if (typeof item === "string" || typeof item === "number") return String(item).trim();
    if (typeof item === "object") return String(item.name ?? item.role ?? item.roleName ?? item.value ?? item.label ?? "").trim();
    return "";
  };

  if (Array.isArray(value)) {
    return value.map(normalizeRoleItem).filter(Boolean);
  }

  if (value && typeof value === "object") {
    const normalized = normalizeRoleItem(value);
    return normalized ? [normalized] : [];
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function hasAnyRole(roles, targets) {
  const normalizedRoles = roles.map((item) => String(item).toLowerCase());
  return targets.some((role) => normalizedRoles.includes(String(role).toLowerCase()));
}

export function getPostLoginPath(roleValue) {
  const roles = Array.isArray(roleValue) ? roleValue : splitRoles(roleValue);

  if (hasAnyRole(roles, ["admin"])) {
    return "/admin/users";
  }

  if (hasAnyRole(roles, ["owner", "pm"])) {
    return "/dashboard";
  }

  if (hasAnyRole(roles, ["team leader", "teamleader", "tl"])) {
    return "/production-plan/assign";
  }

  if (hasAnyRole(roles, ["worker"])) {
    return "/production-plan";
  }

  return "/home";
}
