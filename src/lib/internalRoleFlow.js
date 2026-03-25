export function splitRoles(value) {
  const normalizeRoleItem = (item) => {
    if (item == null) return "";
    if (typeof item === "string" || typeof item === "number") return String(item).trim();
    if (typeof item === "object") {
      return String(item.name ?? item.role ?? item.roleName ?? item.value ?? item.label ?? "").trim();
    }
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

export function hasAnyRole(roleValue, targets) {
  const roles = Array.isArray(roleValue) ? roleValue : splitRoles(roleValue);
  const normalizedRoles = roles.map((item) => String(item).toLowerCase());

  return targets.some((role) => normalizedRoles.includes(String(role).toLowerCase()));
}

export function getPrimaryWorkspaceRole(roleValue) {
  if (hasAnyRole(roleValue, ["admin"])) return "admin";
  if (hasAnyRole(roleValue, ["owner"])) return "owner";
  if (hasAnyRole(roleValue, ["pm", "project manager"])) return "pm";
  if (hasAnyRole(roleValue, ["team leader", "teamleader", "tl"])) return "teamLeader";
  if (hasAnyRole(roleValue, ["worker", "sewer", "tailor", "kcs", "quality control", "qc"])) {
    return "worker";
  }
  if (hasAnyRole(roleValue, ["customer"])) return "customer";
  return "guest";
}
