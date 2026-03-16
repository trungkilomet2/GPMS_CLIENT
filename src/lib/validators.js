const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^(?=.{3,30}$)[A-Za-z0-9._-]+$/;
const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export function normalizeSpaces(value = "") {
  return value.trim().replace(/\s+/g, " ");
}

export function validateRequired(value, label) {
  return String(value ?? "").trim() ? "" : `Vui lòng nhập ${label}`;
}

export function validateUserName(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Vui lòng nhập tên đăng nhập";
  if (!USERNAME_REGEX.test(normalized)) {
    return "Tên đăng nhập 3-30 ký tự, không chứa khoảng trắng hoặc ký tự đặc biệt";
  }
  return "";
}

export function validateFullName(value) {
  const normalized = normalizeSpaces(value);
  if (!normalized) return "Vui lòng nhập họ và tên";
  if (normalized.length < 2) return "Họ và tên phải có ít nhất 2 ký tự";
  if (normalized.length > 50) return "Họ và tên không được vượt quá 50 ký tự";
  return "";
}

export function validateEmail(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Vui lòng nhập email";
  if (!EMAIL_REGEX.test(normalized)) return "Email không hợp lệ";
  return "";
}

export function validatePhoneNumber(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Vui lòng nhập số điện thoại";
  if (!PHONE_REGEX.test(normalized)) return "Số điện thoại không hợp lệ";
  return "";
}

export function validatePassword(value, { required = true } = {}) {
  const password = String(value ?? "");
  if (!password.trim()) return required ? "Vui lòng nhập mật khẩu" : "";
  if (password.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự";
  if (password.length > 100) return "Mật khẩu không được vượt quá 100 ký tự";
  return "";
}

export function validateConfirmPassword(password, confirmPassword) {
  if (!String(confirmPassword ?? "").trim()) {
    return "Vui lòng nhập xác nhận mật khẩu";
  }
  if (confirmPassword !== password) {
    return "Mật khẩu xác nhận không khớp";
  }
  return "";
}

export function validateLocation(value) {
  const normalized = normalizeSpaces(value);
  if (!normalized) return "Vui lòng nhập địa chỉ";
  if (normalized.length < 5) return "Địa chỉ phải có ít nhất 5 ký tự";
  if (normalized.length > 255) return "Địa chỉ không được vượt quá 255 ký tự";
  return "";
}

export function validateAvatarFile(file) {
  if (!file) return "";
  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    return "Ảnh đại diện chỉ hỗ trợ JPG, PNG, GIF hoặc WEBP";
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return "Ảnh đại diện không được vượt quá 5MB";
  }
  return "";
}
