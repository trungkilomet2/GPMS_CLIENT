const AUTH_KEYS = ["token", "user", "userId"];

function moveLegacyValueToSession(key) {
  const sessionValue = sessionStorage.getItem(key);
  if (sessionValue !== null) return sessionValue;

  const legacyValue = localStorage.getItem(key);
  if (legacyValue === null) return null;

  sessionStorage.setItem(key, legacyValue);
  localStorage.removeItem(key);
  return legacyValue;
}

export function getAuthItem(key) {
  if (!AUTH_KEYS.includes(key)) return null;
  return moveLegacyValueToSession(key);
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
