// API Configuration
const BASE_URL = "http://26.250.4.244:5229";

export const API_ENDPOINTS = {

  AUTH: {
    LOGIN: `${BASE_URL}/api/Account/login`,
    REGISTER: `${BASE_URL}/api/Account/register`,
  },

  USER: {
    GET_USER_PROFILE: (id) =>
      `${BASE_URL}/api/User/view-profile/${id}`,

    UPDATE_PROFILE: (id) =>
      `${BASE_URL}/api/User/update-profile/${id}`,
  },

};

export default BASE_URL;