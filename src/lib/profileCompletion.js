import { getPrimaryWorkspaceRole, splitRoles } from "./internalRoleFlow";

const PROFILE_CACHE_PREFIX = "profile-cache:";

function readProfileCache(userId) {
  if (userId == null) return null;

  try {
    const raw = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function isProfileComplete(user) {
  if (!user) return false;

  const userId = user.userId ?? user.id ?? null;
  const cached = readProfileCache(userId) || {};
  const source = { ...cached, ...user }; // user wins if it has values

  const email = String(source.email ?? "").trim();
  const phone = String(source.phoneNumber ?? source.phone ?? "").trim();
  const address = String(source.location ?? source.address ?? "").trim();

  const roleValue = source.role || source.roles || "";
  const roles = splitRoles(roleValue);
  const primaryRole = getPrimaryWorkspaceRole(roles);

  // If the user is a CUSTOMER, they MUST have a phone number and address.
  if (primaryRole === "customer") {
    return Boolean(phone && address);
  }

  // For other internal roles (Owner, PM), we keep the current requirement of email, phone, and address 
  // for total system consistency, OR we could relax it if needed. 
  // Based on the user request, we definitely need it for Customer.
  return Boolean(email && phone && address);
}
