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

  if (Array.isArray(rawRole)) {
    return rawRole.map((item) => String(item).trim()).filter(Boolean).join(",");
  }

  return String(rawRole ?? "").trim();
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
