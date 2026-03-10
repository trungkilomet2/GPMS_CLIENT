import { API_ENDPOINTS } from "@/lib/apiconfig";

const getToken  = () => localStorage.getItem("token");
const getUserId = () => {
  const id = localStorage.getItem("userId");
  if (id && id !== "null") return Number(id);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.userId ?? user.id ?? null;
};

/* ── GET: chỉ cần Bearer token, không cần Content-Type ── */
const authHeadersGet = () => ({
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
});

/* ── multipart/form-data: KHÔNG set Content-Type, browser tự đặt boundary ── */
const authHeadersForm = () => ({
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
});

export const userService = {

  /**
   * GET /api/User/view-profile
   * Backend tự decode userId từ Bearer token — không truyền ID vào URL
   */
  async getProfile() {
    const res = await fetch(API_ENDPOINTS.USER.VIEW_PROFILE, {
      method:  "GET",
      headers: authHeadersGet(),
    });

    const data = await res.json();
    if (!res.ok) throw { response: { data } };

    // Chuẩn hoá field names — API trả: fullName, phoneNumber, avartarUrl, location, email
    const profile = {
      id:         getUserId(),
      fullName:   data.data?.fullName    ?? data.fullName    ?? "",
      email:      data.data?.email       ?? data.email       ?? "",
      phoneNumber:      data.data?.phoneNumber ?? data.phoneNumber ?? "",
      avatarUrl:  data.data?.avartarUrl  ?? data.avartarUrl  ?? "",
      location:    data.data?.location    ?? data.location    ?? "",
    };

    // Sync localStorage
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    localStorage.setItem("user", JSON.stringify({ ...stored, ...profile }));
    window.dispatchEvent(new Event("auth-change"));

    return profile;
  },

  /**
   * PUT /api/User/update-profile
   * Body: multipart/form-data
   * Fields: FullName, PhoneNumber, AvartarUrl (file binary), Location, Email
   *
   * @param {string|number} _userId  — giữ tham số để không break chỗ gọi cũ, không dùng trong URL
   * @param {FormData}       formData — đã được build sẵn ở ProfileEdit
   */
  async updateProfile(_userId, formData) {
    const res = await fetch(API_ENDPOINTS.USER.UPDATE_PROFILE, {
      method:  "PUT",
      headers: authHeadersForm(),  // KHÔNG set Content-Type!
      body:    formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { response: { data } };

    // Sync localStorage từ FormData
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    const updated = {
      ...stored,
      fullName:  formData.get("FullName")    ?? stored.fullName,
      email:     formData.get("Email")       ?? stored.email,
      phone:     formData.get("PhoneNumber") ?? stored.phone,
      address:   formData.get("Location")    ?? stored.address,
    };
    localStorage.setItem("user", JSON.stringify(updated));
    window.dispatchEvent(new Event("auth-change"));

    return data;
  },
};