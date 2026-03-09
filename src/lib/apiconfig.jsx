//API Configuration
//const BASE_URL = 'http://localhost:5229'; // Development http URL
const BASE_URL = 'http://26.250.4.244:5229'; // Server Development http URL

// const BASE_URL = 'https://localhost:7096'; // Development https URL
// const BASE_URL = ''; // Production URL

export const API_ENDPOINTS = {
    ACCOUNT: {
        LOGIN: `${BASE_URL}/api/Account/login`,
        REGISTER: `${BASE_URL}/api/Account/register`,
    },
    ORDER: {
        GET_ALL: `${BASE_URL}/api/Order/order-list`,
        GET_DETAIL: (orderId) => `${BASE_URL}/api/Order/order-detail/${orderId}`,
        GET_ORDERS_BY_USER: (userId) => `${BASE_URL}/api/Order/my-orders/${userId}`,
        CREATE_ORDER: `${BASE_URL}/api/Order/create-order`,
        UPDATE_ORDER: (orderId) => `${BASE_URL}/api/Order/${orderId}/update`,
        GET_UPDATE_ORDER_HISTORY: (orderId) => `${BASE_URL}/api/Order/${orderId}/history`,
    },
    COMMENT: {
        GET_BY_ORDER: (orderId) => `${BASE_URL}/api/Comment/get-comment-by-orderId/${orderId}`,
        CREATE_COMMENT: `${BASE_URL}/api/Comment/create-comment`,
    },
    USER: {
        GET_USER_PROFILE: (id) => `${BASE_URL}/api/User/view-profile/${id}`,
        UPDATE_PROFILE: (id) => `${BASE_URL}/api/User/update-profile/${id}`,
    }
}

export default BASE_URL;