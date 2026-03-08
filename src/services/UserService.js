import axiosClient from "../lib/axios";
import { API_ENDPOINTS } from "../lib/apiconfig";

const UserService = {

  getUserProfile: async (userId) => {
    const res = await axiosClient.get(
      API_ENDPOINTS.USER.GET_USER_PROFILE(userId)
    );
    return res.data;
  },

  updateUserProfile: async (userId, data) => {
    const res = await axiosClient.put(
      API_ENDPOINTS.USER.UPDATE_PROFILE(userId),
      data
    );
    return res.data;
  },

};

export default UserService;