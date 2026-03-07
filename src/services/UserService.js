import axiosClient from "../lib/axios";
import { API_ENDPOINTS } from "../lib/apiconfig";

const UserService = {
    getUserProfile: (userId) => {
        return axiosClient.get(API_ENDPOINTS.USER.GET_USER_PROFILE(userId));
    }
}

export default UserService;