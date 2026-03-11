import { API_ENDPOINTS } from "@/lib/apiconfig";

const getToken  = () => localStorage.getItem("token");
const getUserId = () => {
  const id = localStorage.getItem("userId");
  if (id && id !== "null") return Number(id);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.userId ?? user.id ?? null;
};

const authHeadersGet  = () => ({
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
});

const authHeadersForm = () => ({
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
  // KHÔNG set Content-Type — browser tự đặt boundary cho multipart
});

export const userService = {

  /**
   * GET /api/User/view-profile
   * Response schema:
   * {
   *   data: {
   *     fullName:    string,
   *     phoneNumber: string,
   *     avartarUrl:  string,   ← typo từ backend (thiếu 'a')
   *     location:    string,
   *     email:       string
   *   },
   *   pageIndex:   number,
   *   pageSize:    number,
   *   recordCount: number,
   *   links:       [...]
   * }
   */
  async getProfile() {
    const res = await fetch(API_ENDPOINTS.USER.VIEW_PROFILE, {
      method:  "GET",
      headers: authHeadersGet(),
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw { status: 401 };
    }

    const json = await res.json();
    if (!res.ok) throw { response: { data: json } };

    // Unwrap data, map đúng field (kể cả typo avartarUrl)
    const d = json.data ?? {};
    const profile = {
      id:          getUserId(),
      fullName:    d.fullName    || "",
      name:        d.fullName    || "",
      email:       d.email       || "",
      phoneNumber: d.phoneNumber || "",
      phone:       d.phoneNumber || "",
      avatarUrl:   d.avartarUrl  || "",   // ← đọc avartarUrl (typo backend), lưu thành avatarUrl
      location:    d.location    || "",
      address:     d.location    || "",
    };

    // Sync localStorage
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    localStorage.setItem("user", JSON.stringify({
      ...stored,
      ...profile,
      bio: stored.bio ?? "",
      cooperationNotes: stored.cooperationNotes ?? [],
    }));

    return {
      ...profile,
      bio: stored.bio ?? "",
      cooperationNotes: stored.cooperationNotes ?? [],
    };
  },

  /**
   * PUT /api/User/update-profile
   * Body: multipart/form-data
   * Fields: FullName, PhoneNumber, AvartarUrl (file binary), Location, Email
   */
  async updateProfile(_userId, formData) {
    const userId = _userId ?? getUserId();
    const endpoint = userId
      ? `${API_ENDPOINTS.USER.UPDATE_PROFILE}?id=${encodeURIComponent(userId)}`
      : API_ENDPOINTS.USER.UPDATE_PROFILE;

    const res = await fetch(endpoint, {
      method:  "PUT",
      headers: authHeadersForm(),
      body:    formData,
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw { status: 401 };
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw { response: { data: json } };

    // Sync localStorage từ response backend để tránh lệch dữ liệu hiển thị
    const d = json.data ?? {};
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    localStorage.setItem("user", JSON.stringify({
      ...stored,
      id:          d.id          ?? stored.id,
      userId:      d.id          ?? stored.userId,
      userName:    d.userName    ?? stored.userName,
      fullName:    d.fullName    ?? stored.fullName,
      name:        d.fullName    ?? stored.name,
      email:       d.email       ?? stored.email,
      phoneNumber: d.phoneNumber ?? stored.phoneNumber,
      phone:       d.phoneNumber ?? stored.phone,
      avatarUrl:   d.avartarUrl  ?? stored.avatarUrl,
      location:    d.location    ?? stored.location,
      address:     d.location    ?? stored.address,
    }));
    window.dispatchEvent(new Event("auth-change"));

    return json;
  },
};
