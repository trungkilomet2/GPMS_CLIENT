function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return String(value).trim() === "";
}

function pickFirstValue(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key];
    if (!isEmptyValue(value)) {
      return value;
    }
  }

  return "";
}

export function extractRoleValue(source = {}) {
  const rawRole = pickFirstValue(source, [
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
    "role",
    "roles",
    "Role",
    "Roles",
    "roleName",
    "RoleName",
  ]);

  const normalizeRoleItem = (item) => {
    if (item == null) return "";

    if (typeof item === "string" || typeof item === "number") {
      return String(item).trim();
    }

    if (typeof item === "object") {
      const name =
        item.name ??
        item.role ??
        item.roleName ??
        item.RoleName ??
        item.value ??
        item.label;

      return String(name ?? "").trim();
    }

    return "";
  };

  if (Array.isArray(rawRole)) {
    return rawRole
      .map(normalizeRoleItem)
      .filter((v) => v && v !== "[object Object]")
      .join(",");
  }

  if (rawRole && typeof rawRole === "object") {
    return normalizeRoleItem(rawRole);
  }

  const s = String(rawRole ?? "").trim();
  return s === "[object Object]" ? "" : s;
}

export function extractUserIdValue(source = {}) {
  return String(
    pickFirstValue(source, [
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      "nameidentifier",
      "sub",
      "userId",
      "UserId",
      "id",
      "Id",
      "uid",
    ]) ?? ""
  ).trim();
}
