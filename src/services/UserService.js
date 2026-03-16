import { API_ENDPOINTS } from "@/lib/apiconfig";
import { extractRoleValue, extractUserIdValue } from "@/lib/authIdentity";
import { clearAuthStorage, getAuthItem, getStoredUser, removeAuthItem, setStoredUser } from "@/lib/authStorage";

const readAccountStatus = (source = {}) => {
  const status = String(
    source.status ??
    source.accountStatus ??
    source.userStatus ??
    ""
  ).trim().toLowerCase();

  const disabledFlag = source.disabled ?? source.isDisabled ?? source.locked ?? source.isLocked;
  const activeFlag = source.isActive ?? source.active;

  const isDisabled =
    disabledFlag === true ||
    activeFlag === false ||
    ["disabled", "inactive", "locked", "blocked", "banned"].includes(status);

  return { isDisabled, status };
};

const getToken  = () => getAuthItem("token");
const getUserId = () => {
  const id = getAuthItem("userId");
  if (id && id !== "null") return Number(id);
  const user = getStoredUser() || {};
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
      credentials: "omit",
      headers: authHeadersGet(),
    });

    if (res.status === 401) {
      removeAuthItem("token");
      removeAuthItem("user");
      window.location.href = "/login";
      throw { status: 401 };
    }

    const json = await res.json();
    if (!res.ok) throw { response: { data: json } };

    // Unwrap data, map đúng field (kể cả typo avartarUrl)
    const d = json.data ?? {};
    const accountStatus = readAccountStatus(d);

    if (accountStatus.isDisabled) {
      clearAuthStorage();
      throw {
        response: {
          data: {
            status: 403,
            message: "Tài khoản này đã bị vô hiệu hóa.",
          },
        },
      };
    }

    const profile = {
      id:          extractUserIdValue(d) || getUserId(),
      userId:      extractUserIdValue(d) || getUserId(),
      fullName:    d.fullName    || "",
      name:        d.fullName    || "",
      email:       d.email       || "",
      phoneNumber: d.phoneNumber || "",
      phone:       d.phoneNumber || "",
      role:        extractRoleValue(d) || (getStoredUser()?.role ?? ""),
      avatarUrl:   d.avartarUrl  || "",   // ← đọc avartarUrl (typo backend), lưu thành avatarUrl
      location:    d.location    || "",
      address:     d.location    || "",
      accountStatus,
    };

    // Sync localStorage
    const stored = getStoredUser() || {};
    setStoredUser({
      ...stored,
      ...profile,
      bio: stored.bio ?? "",
      cooperationNotes: stored.cooperationNotes ?? [],
    });

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
      credentials: "omit",
      headers: authHeadersForm(),
      body:    formData,
    });

    if (res.status === 401) {
      removeAuthItem("token");
      removeAuthItem("user");
      window.location.href = "/login";
      throw { status: 401 };
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw { response: { data: json } };

    // Sync localStorage từ response backend để tránh lệch dữ liệu hiển thị
    const d = json.data ?? {};
    const stored = getStoredUser() || {};
    setStoredUser({
      ...stored,
      id:          d.id          ?? stored.id,
      userId:      d.id          ?? stored.userId,
      userName:    d.userName    ?? stored.userName,
      fullName:    d.fullName    ?? stored.fullName,
      name:        d.fullName    ?? stored.name,
      role:        extractRoleValue(d) || stored.role,
      email:       d.email       ?? stored.email,
      phoneNumber: d.phoneNumber ?? stored.phoneNumber,
      phone:       d.phoneNumber ?? stored.phone,
      avatarUrl:   d.avartarUrl  ?? stored.avatarUrl,
      location:    d.location    ?? stored.location,
      address:     d.location    ?? stored.address,
    });
    window.dispatchEvent(new Event("auth-change"));

    return json;
  },
};
