//API Configuration
const BASE_URL = 'http://localhost:5229'; // Development http URL
// const BASE_URL = 'https://localhost:7096'; // Development https URL
// const BASE_URL = ''; // Production URL

export const API_ENDPOINTS = {
    ORDER: {
        GET_ALL: `${BASE_URL}/api/orders`,
        GET_DETAIL: (id) => `${BASE_URL}/api/orders/${id}`,
        CREATE: `${BASE_URL}/api/orders`,
    }
}

export default BASE_URL;