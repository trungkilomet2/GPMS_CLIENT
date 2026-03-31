/**
 * Trích xuất lỗi chi tiết từ phản hồi của API (Axios Error).
 * @param {any} error - Đối tượng lỗi từ Axios.
 * @param {string} fallbackMsg - Thông báo thay thế nếu không tìm thấy lỗi từ API.
 * @returns {string} - Chuỗi thông báo lỗi.
 */
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
      .map((msg) => String(msg))
      .filter(Boolean);
      
    if (errorStrings.length > 0) return errorStrings.join(" | ");
  }
  
  // Trường hợp API trả về thuộc tính message hoặc detail
  if (data.message) return String(data.message);
  if (data.detail) return String(data.detail);
  if (data.title && data.title !== "One or more validation errors occurred.") return String(data.title);
  
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
    return data;
  }

  // Cuối cùng dùng message từ Axios hoặc fallback
  return error?.message || fallbackMsg;
};
