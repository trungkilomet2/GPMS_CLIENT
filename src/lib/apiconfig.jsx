//API Configuration
const BASE_URL = 'http://localhost:5229'; // Development http URL
// const BASE_URL = 'https://localhost:7096'; // Development https URL
// const BASE_URL = ''; // Production URL

export const API_ENDPOINTS = {
    ORDER: {
        GET_ALL: `${BASE_URL}/api/Order`,
        GET_DETAIL: (id) => `${BASE_URL}/api/Order/${id}`,
        CREATE: `${BASE_URL}/api/orders`,
    },
    COMMENT: {
        GET_BY_ORDER: (orderId) => `${BASE_URL}/api/Comment/${orderId}`,
    },
    USER: {
        GET_USER_PROFILE: (userId) => `${BASE_URL}/api/User/view-profile/${userId}`,
    }
}

export default BASE_URL;