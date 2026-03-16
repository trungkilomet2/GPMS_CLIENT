export function splitRoles(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
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
    return "/monitoring/assign";
  }

  if (hasAnyRole(roles, ["worker", "sewer", "tailor"])) {
    return "/worker/assignments";
  }

  return "/home";
}
