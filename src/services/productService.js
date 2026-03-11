 import { API_ENDPOINTS } from "@/lib/apiconfig";
import { getAuthItem } from "@/lib/authStorage";

export const productService = {

  async getAll() {

    const token = getAuthItem("token");

    const res = await fetch(API_ENDPOINTS.PRODUCT.GET_ALL, {
      method: "GET",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : ""
      }
    });

    if (!res.ok) {
      throw new Error("Không thể tải danh sách sản phẩm");
    }

    return res.json();
  }

};
