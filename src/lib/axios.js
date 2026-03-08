import axios from "axios";
import BASE_URL from "./apiconfig";

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

export const authService = {

  login: async (payload) => {
    const response = await api.post("/Account/login", payload);
    return response.data;
  },

  register: async (payload) => {
    const response = await api.post("/Account/register", payload);
    return response.data;
  },

};

export default api;