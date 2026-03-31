import { useMemo } from 'react';
import { getStoredUser } from '@/lib/authStorage';
import { extractRoleValue } from '@/lib/authIdentity';
import { getPrimaryWorkspaceRole, hasAnyRole, splitRoles } from '@/lib/internalRoleFlow';

export function useAuth() {
  const currentUser = useMemo(() => getStoredUser() || {}, []);
  const roleValue = extractRoleValue(currentUser) || currentUser?.role || currentUser?.roles || "";
  
  const roles = useMemo(() => splitRoles(roleValue).map((role) => role.toLowerCase()), [roleValue]);
  const primaryRole = getPrimaryWorkspaceRole(roleValue);
  
  const isOwner = roles.includes("owner");
  const isPm = roles.includes("pm") || roles.includes("project manager");
  const isWorker = primaryRole === "worker";
  
  const currentUserId = currentUser?.userId ?? currentUser?.id ?? null;

  return {
    currentUser,
    roleValue,
    roles,
    primaryRole,
    isOwner,
    isPm,
    isWorker,
    currentUserId
  };
}
