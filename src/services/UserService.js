import { API_ENDPOINTS } from "@/lib/apiconfig";

const getToken = () => localStorage.getItem("token");
const getUserId = () => localStorage.getItem("userId");

const authHeaders = () => {
  const token = getToken();

  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    "Content-Type": "application/json"
  };
};

export const userService = {

  /* =========================
     GET PROFILE
  ========================= */
  async getProfile(userId) {

    const id = userId || getUserId();

    if (!id) throw new Error("UserId not found");

    const res = await fetch(
      API_ENDPOINTS.USER.GET_USER_PROFILE(id),
      {
        method: "GET",
        headers: authHeaders()
      }
    );

   const json = await res.json().catch(() => ({}));
const data = json.data || {};

const profile = {
  id,
  fullName: data.fullName ?? "",
  email: data.email ?? "",
  phone: data.phoneNumber ?? "",
  avatarUrl: data.avartarUrl ?? "",
  address: data.location ?? ""
};

    const stored = JSON.parse(localStorage.getItem("user") || "{}");

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...stored,
        ...profile
      })
    );

    window.dispatchEvent(new Event("auth-change"));

    return profile;
  },

  /* =========================
     UPDATE PROFILE
  ========================= */
  async updateProfile(payload, userId) {

    const id = userId || getUserId();

    if (!id) throw new Error("UserId not found");

    const body = {
      fullName: payload.fullName || "",
      phoneNumber: payload.phone || "",
      avartarUrl: payload.avatarUrl || "",
      location: payload.address || "",
      email: payload.email || ""
    };

    const res = await fetch(
      API_ENDPOINTS.USER.UPDATE_USER_PROFILE(id),
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(body)
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw { response: { data } };

    const stored = JSON.parse(localStorage.getItem("user") || "{}");

    const updated = {
      ...stored,
      ...payload
    };

    localStorage.setItem("user", JSON.stringify(updated));

    window.dispatchEvent(new Event("auth-change"));

    return updated;
  }

};