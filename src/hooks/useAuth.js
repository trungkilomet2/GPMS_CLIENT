import { useMemo } from 'react';
import { getStoredUser } from '@/lib/authStorage';
import { extractRoleValue } from '@/lib/authIdentity';
import { hasAnyRole } from '@/lib/roleAccess';

export function splitRoles(value) {
  const normalizeRoleItem = (item) => {
    if (item == null) return "";
    if (typeof item === "string" || typeof item === "number") return String(item).trim();
    if (typeof item === "object") return String(item.name ?? item.role ?? item.roleName ?? item.value ?? item.label ?? "").trim();
    return "";
  };

  if (Array.isArray(value)) return value.map(normalizeRoleItem).filter(Boolean);

  if (value && typeof value === "object") {
    const normalized = normalizeRoleItem(value);
    return normalized ? [normalized] : [];
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function useAuth() {
  const currentUser = useMemo(() => getStoredUser() || {}, []);
  const roleValue = extractRoleValue(currentUser) || currentUser?.role || currentUser?.roles || "";
  
  const roles = useMemo(() => splitRoles(roleValue).map((role) => role.toLowerCase()), [roleValue]);
  
  const isOwner = roles.includes("owner");
  const isPm = roles.includes("pm") || roles.includes("project manager");
  const isWorker = hasAnyRole ? hasAnyRole(roleValue, ["worker", "sewer", "tailor"]) : roles.includes("worker") || roles.includes("sewer") || roles.includes("tailor");
  
  const currentUserId = currentUser?.userId ?? currentUser?.id ?? null;

  return {
    currentUser,
    roleValue,
    roles,
    isOwner,
    isPm,
    isWorker,
    currentUserId
  };
}
