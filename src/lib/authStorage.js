const AUTH_KEYS = ["token", "user", "userId"];
const AUTH_HANDOFF_PREFIX = "__gpms_auth_handoff__:";
const AUTH_HANDOFF_MAX_AGE = 60 * 1000;

AUTH_KEYS.forEach((key) => {
  localStorage.removeItem(key);
});

function cleanupExpiredHandoffs() {
  const now = Date.now();

  Object.keys(localStorage).forEach((key) => {
    if (!key.startsWith(AUTH_HANDOFF_PREFIX)) return;

    try {
      const payload = JSON.parse(localStorage.getItem(key) || "{}");
      if (!payload.createdAt || now - payload.createdAt > AUTH_HANDOFF_MAX_AGE) {
        localStorage.removeItem(key);
      }
    } catch {
      localStorage.removeItem(key);
    }
  });
}

export function getAuthItem(key) {
  if (!AUTH_KEYS.includes(key)) return null;
  return sessionStorage.getItem(key);
}

export function setAuthItem(key, value) {
  if (!AUTH_KEYS.includes(key)) return;
  sessionStorage.setItem(key, value);
  localStorage.removeItem(key);
}

export function removeAuthItem(key) {
  if (!AUTH_KEYS.includes(key)) return;
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
}

export function clearAuthStorage() {
  AUTH_KEYS.forEach(removeAuthItem);
}

export function getStoredUser() {
  const raw = getAuthItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    removeAuthItem("user");
    return null;
  }
}

export function setStoredUser(user) {
  setAuthItem("user", JSON.stringify(user));
}

export function buildAuthHandoffPath(path) {
  const token = sessionStorage.getItem("token");
  const user = sessionStorage.getItem("user");
  const userId = sessionStorage.getItem("userId");

  if (!token || !user) return path;

  cleanupExpiredHandoffs();

  const handoffId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(
    `${AUTH_HANDOFF_PREFIX}${handoffId}`,
    JSON.stringify({
      createdAt: Date.now(),
      token,
      user,
      userId,
    })
  );

  const url = new URL(path, window.location.origin);
  url.searchParams.set("authHandoff", handoffId);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function consumeAuthHandoff(search = window.location.search) {
  cleanupExpiredHandoffs();

  const params = new URLSearchParams(search);
  const handoffId = params.get("authHandoff");
  if (!handoffId) return false;

  const key = `${AUTH_HANDOFF_PREFIX}${handoffId}`;
  const raw = localStorage.getItem(key);
  localStorage.removeItem(key);
  if (!raw) return false;

  try {
    const payload = JSON.parse(raw);
    if (!payload.createdAt || Date.now() - payload.createdAt > AUTH_HANDOFF_MAX_AGE) {
      return false;
    }

    if (payload.token) sessionStorage.setItem("token", payload.token);
    if (payload.user) sessionStorage.setItem("user", payload.user);
    if (payload.userId) sessionStorage.setItem("userId", payload.userId);
    return true;
  } catch {
    return false;
  }
}
