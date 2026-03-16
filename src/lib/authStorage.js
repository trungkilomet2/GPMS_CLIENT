const AUTH_KEYS = ["token", "user", "userId"];

export function getAuthItem(key) {
  if (!AUTH_KEYS.includes(key)) return null;
  return localStorage.getItem(key);
}

export function setAuthItem(key, value) {
  if (!AUTH_KEYS.includes(key)) return;
  localStorage.setItem(key, value);
}

export function removeAuthItem(key) {
  if (!AUTH_KEYS.includes(key)) return;
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
