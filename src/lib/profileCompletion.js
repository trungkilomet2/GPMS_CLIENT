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

  return Boolean(email && phone && address);
}
