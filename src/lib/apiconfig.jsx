// API Configuration
// const BASE_URL = 'http://localhost:5229';
const BASE_URL = 'http://26.250.4.244:5229';

// const BASE_URL = 'https://localhost:7096';
// const BASE_URL = '';

export const API_ENDPOINTS = {
  ACCOUNT: {
    LOGIN: `${BASE_URL}/api/Account/login`,
    REGISTER: `${BASE_URL}/api/Account/register`,
  },

  ORDER: {
    GET_ALL: `${BASE_URL}/api/Order/order-list`,
    GET_DETAIL: (orderId) => `${BASE_URL}/api/Order/order-detail/${orderId}`,
    GET_ORDERS_BY_USER: `${BASE_URL}/api/Order/my-orders`,
    CREATE_ORDER: `${BASE_URL}/api/Order/create-order`,
    UPDATE_ORDER: (orderId) => `${BASE_URL}/api/Order/${orderId}/update`,
    GET_UPDATE_ORDER_HISTORY: (orderId) => `${BASE_URL}/api/Order/${orderId}/history`,
  },

  CLOUDINARY: {
    IMAGE_UPLOAD: `${BASE_URL}/api/Cloudinary/image-upload`,
    TEMPLATE_UPLOAD: `${BASE_URL}/api/Cloudinary/template-file-upload`,
  },

  COMMENT: {
    GET_BY_ORDER: (orderId) => `${BASE_URL}/api/Comment/get-comment-by-orderId/${orderId}`,
    CREATE_COMMENT: `${BASE_URL}/api/Comment/create-comment`,
  },

  USER: {
    // GET — không có ID, backend decode từ token
    VIEW_PROFILE: `${BASE_URL}/api/User/view-profile`,
    // PUT — multipart/form-data
    UPDATE_PROFILE: `${BASE_URL}/api/User/update-profile`,
  },

  WORKER: {
    GET_ALL_EMPLOYEES: `${BASE_URL}/api/Worker/get-all-employees`,
    GET_BY_ID: (userId) => `${BASE_URL}/api/Worker/get-employee-by-id/${userId}`,
    CREATE: `${BASE_URL}/api/Worker/create-employee`,
    UPDATE: (userId) => `${BASE_URL}/api/Worker/update-employee/${userId}`,
  },

  WORKER_ROLE: {
    GET_ALL: `${BASE_URL}/api/WorkerRole/get-all-worker-roles`,
    CREATE: `${BASE_URL}/api/WorkerRole/create-worker-roles`,
  },

  LEAVE_REQUEST: {
    GET_LIST: `${BASE_URL}/api/LeaveRequest/leave-request-list`,
    GET_DETAIL: (id) => `${BASE_URL}/api/LeaveRequest/leave-request-detail/${id}`,
    APPROVE: (id) => `${BASE_URL}/api/LeaveRequest/${id}/approve`,
    DENY: (id) => `${BASE_URL}/api/LeaveRequest/${id}/deny`,
  },

  // TODO: thêm endpoint thật khi backend có sẵn
  PRODUCT: {
    GET_ALL: `${BASE_URL}/api/Product/product-list`,
  },
};

export default BASE_URL;
