/**
 * Trích xuất lỗi chi tiết từ phản hồi của API (Axios Error).
 * @param {any} error - Đối tượng lỗi từ Axios.
 * @param {string} fallbackMsg - Thông báo thay thế nếu không tìm thấy lỗi từ API.
 * @returns {string} - Chuỗi thông báo lỗi.
 */
const translateBackendErrorMessage = (message) => {
  const normalized = String(message ?? "").trim();
  const lowerCased = normalized.toLowerCase();

  if (!normalized) return "";

  if (lowerCased === "username already exists") {
    return "Tên đăng nhập đã tồn tại.";
  }

  if (lowerCased === "email already exists" || lowerCased === "email already registered") {
    return "Email đã tồn tại trong hệ thống.";
  }

  if (lowerCased.includes("username already exists")) {
    return "Tên đăng nhập đã tồn tại.";
  }

  if (lowerCased.includes("email already exists") || lowerCased.includes("email already registered")) {
    return "Email đã tồn tại trong hệ thống.";
  }

  if (lowerCased.includes("the avatarurl field is required")) {
    return "Ảnh đại diện là bắt buộc theo cấu hình backend hiện tại.";
  }

  if (lowerCased.includes("the email field is required")) {
    return "Vui lòng nhập email.";
  }

  if (lowerCased.includes("the username field is required") || lowerCased.includes("the user name field is required")) {
    return "Vui lòng nhập tên đăng nhập.";
  }

  if (lowerCased.includes("the password field is required")) {
    return "Vui lòng nhập mật khẩu.";
  }

  if (lowerCased.includes("one or more validation errors occurred")) {
    return "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại thông tin đã nhập.";
  }

  return normalized;
};

export const getErrorMessage = (error, fallbackMsg = "Thao tác thất bại.") => {
  if (error?.response?.status === 403) {
    return "Bạn không có quyền truy cập chức năng này.";
  }

  const data = error?.response?.data;
  if (!data) return error?.message || fallbackMsg;

  // Trường hợp API trả về mảng lỗi (Validation Errors) từ .NET Identity hoặc FluentValidation
  if (data.errors && typeof data.errors === "object") {
    const errorStrings = Object.values(data.errors)
      .flat()
      .map((msg) => translateBackendErrorMessage(String(msg)))
      .filter(Boolean);
      
    if (errorStrings.length > 0) return errorStrings.join(" | ");
  }
  
  // Trường hợp API trả về thuộc tính message hoặc detail
  if (data.message) return translateBackendErrorMessage(String(data.message));
  if (data.detail) return translateBackendErrorMessage(String(data.detail));
  if (data.title && data.title !== "One or more validation errors occurred.") {
    return translateBackendErrorMessage(String(data.title));
  }
  
  // Trường hợp data là chuỗi thuần túy
  if (typeof data === "string" && data.trim()) {
    // Detect if the string is an HTML document (common for 500 server errors)
    if (data.includes("<!DOCTYPE") || data.includes("<html")) {
      const statusText = error?.response?.status ? ` (Mã: ${error.response.status})` : "";
      return `Máy chủ gặp sự cố${statusText}. Vui lòng liên hệ kỹ thuật.`;
    }
    // Truncate long messages (like partial stack traces) instead of using fallback
    if (data.length > 300) {
      return data.substring(0, 250) + "...";
    }
    return translateBackendErrorMessage(data);
  }

  // Cuối cùng dùng message từ Axios hoặc fallback
  return translateBackendErrorMessage(error?.message) || fallbackMsg;
};
