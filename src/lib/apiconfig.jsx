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

  EMAIL: {
    SEND_OTP: `${BASE_URL}/api/Email/sent-otp-email`,
    VERIFY_EMAIL: `${BASE_URL}/api/Email/verify-email`,
  },

  ORDER: {
    GET_ALL: `${BASE_URL}/api/Order/order-list`,
    GET_DETAIL: (orderId) => `${BASE_URL}/api/Order/order-detail/${orderId}`,
    GET_ORDERS_BY_USER: `${BASE_URL}/api/Order/my-orders`,
    CREATE_ORDER: `${BASE_URL}/api/Order/create-order`,
    UPDATE_ORDER: (orderId) => `${BASE_URL}/api/Order/${orderId}/update`,
    GET_UPDATE_ORDER_HISTORY: (orderId) => `${BASE_URL}/api/Order/${orderId}/history`,
    REQUEST_MODIFICATION: (orderId) => `${BASE_URL}/api/Order/request-order-modification/${orderId}`,
    DENY_ORDER: (orderId) => `${BASE_URL}/api/Order/deny-order/${orderId}`,
    APPROVE_ORDER: (orderId) => `${BASE_URL}/api/Order/${orderId}/approve`,
  },
  ORDER_REJECT: {
    REJECT: `${BASE_URL}/api/OrderReject/order-reject`,
    GET_BY_ID: (id) => `${BASE_URL}/api/OrderReject/order-reject-by-id/${id}`,
  },
  PRODUCTION: {
    CREATE: `${BASE_URL}/api/Production/production/create`,
    LIST: `${BASE_URL}/api/Production/production/list`,
    DETAIL: (id) => `${BASE_URL}/api/Production/production/detail/${id}`,
    UPDATE_PM: (productionId, pmId) => `${BASE_URL}/api/Production/production/update-pm/${productionId}/${pmId}`,
    APPROVE: (id) => `${BASE_URL}/api/Production/production/approve/${id}`,
    REJECT: (id) => `${BASE_URL}/api/Production/production/reject/${id}`,
    REJECT_REASON: (id) => `${BASE_URL}/api/Production/production/reject-reason/detail/${id}`,
    ISSUES: (id) => `${BASE_URL}/api/Production/production/issues/${id}`,
    ISSUES_SUMMARY: (id) => `${BASE_URL}/api/Production/production/issues/summary-by-type/${id}`,
    APPROVE_PLAN: (id) => `${BASE_URL}/api/Production/production/approve/production-plan/${id}`,
    NEED_UPDATE_PLAN: (id) => `${BASE_URL}/api/Production/production/need-update/production-plan/${id}`,
    SUBMIT_PLAN: (id) => `${BASE_URL}/api/Production/production/submit/production-plan/${id}`,
    OUTPUT_HISTORY_WORKER: (workerId) => `${BASE_URL}/api/Production/production/output/history/worker/${workerId}`,
    OUTPUT_HISTORY_ALL: `${BASE_URL}/api/Production/production/output/history`,
  },
  PRODUCTION_PART: {
    LIST_BY_PRODUCTION: (productionId) =>
      `${BASE_URL}/api/ProductionPart/production/get-list-parts/${productionId}`,
    CREATE_PARTS: (productionId) =>
      `${BASE_URL}/api/ProductionPart/production/create-parts/${productionId}`,
    LIST_ASSIGN_WORKERS: `${BASE_URL}/api/ProductionPart/parts/list-assign-workers`,
    UPDATE_ASSIGN_WORKERS: (id) =>
      `${BASE_URL}/api/ProductionPart/parts/update-assign-workers/${id}`,
    CREATE_WORK_LOGS: (partId) => `${BASE_URL}/api/ProductionPart/parts/create-work-logs/${partId}`,
    UPDATE_WORK_LOGS: (partId, logId) => `${BASE_URL}/api/ProductionPart/parts/update-work-logs/${partId}/${logId}`,
    GET_WORK_LOGS: (partId) => `${BASE_URL}/api/ProductionPart/parts/get-work-logs/${partId}`,
    CREATE_ISSUE: (partId) => `${BASE_URL}/api/ProductionPart/${partId}/issue`,
  },

  CUTTING_NOTEBOOK: {
    CREATE: `${BASE_URL}/api/CuttingNotebook/notebook/create`,
    GET_BY_PRODUCTION: (productionId) => `${BASE_URL}/api/CuttingNotebook/notebook/production/${productionId}`,
    GET_BY_ID: (notebookId) => `${BASE_URL}/api/CuttingNotebook/notebook/${notebookId}`,
    UPDATE: (notebookId) => `${BASE_URL}/api/CuttingNotebook/notebook/update/${notebookId}`,
    CREATE_LOG: (notebookId) => `${BASE_URL}/api/CuttingNotebook/notebook/create-logs/${notebookId}`,
    GET_LOGS: (notebookId) => `${BASE_URL}/api/CuttingNotebook/notebook/get-list-logs/${notebookId}`,
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
    LIST: `${BASE_URL}/api/User`,
    USER_DETAIL: (id) => `${BASE_URL}/api/User/user-detail/${id}`,
    GET_USER_DETAIL: (id) => `${BASE_URL}/api/User/get-user-detail/${id}`,
    ADMIN_USER_LIST: `${BASE_URL}/api/User/admin/user-list`,
    ADMIN_USER_DETAIL: (id) => `${BASE_URL}/api/User/user-detail/${id}`,
    ADMIN_CREATE_USER: `${BASE_URL}/api/User/admin/create-user`,
    ADMIN_DISABLE_USER: (id) => `${BASE_URL}/api/User/admin/disable/${id}`,
    ADMIN_ASSIGN_ROLES: (id) => `${BASE_URL}/api/User/admin/assign-roles/${id}`,
    ADMIN_UPDATE_USER: (id) => `${BASE_URL}/api/User/update-user-for-admin/${id}`,
    // PUT — multipart/form-data
    UPDATE_PROFILE: `${BASE_URL}/api/User/update-profile`,
  },

  PERMISSION: {
    GET_ALL: `${BASE_URL}/api/Permission`,
    UPDATE: (id) => `${BASE_URL}/api/Permission/${id}`,
    AUDIT: `${BASE_URL}/api/Permission/audit`,
    ROLE_LIST: `${BASE_URL}/api/Role`,
  },

  LOG: {
    GET_ALL: `${BASE_URL}/api/Log/get-all-log-events`,
  },

  WORKER: {
    GET_ALL_EMPLOYEES: `${BASE_URL}/api/Worker/get-all-employees`,
    GET_ALL_EMPLOYEES_BY_PM_ID: `${BASE_URL}/api/Worker/get-all-employees-by-pm-id`,
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
    GET_MY_HISTORY: `${BASE_URL}/api/LeaveRequest/my-leave-request-history`,
    GET_MY_HISTORY_DETAIL: (id) => `${BASE_URL}/api/LeaveRequest/my-leave-request-history/${id}`,
    GET_DETAIL: (id) => `${BASE_URL}/api/LeaveRequest/leave-request-detail/${id}`,
    CREATE: `${BASE_URL}/api/LeaveRequest/create`,
    APPROVE: (id) => `${BASE_URL}/api/LeaveRequest/${id}/approve`,
    DENY: (id) => `${BASE_URL}/api/LeaveRequest/${id}/deny`,
    CANCEL: (id) => `${BASE_URL}/api/LeaveRequest/${id}/cancel`,
    REQUEST_CANCEL: (id) => `${BASE_URL}/api/LeaveRequest/${id}/request-cancel`,
    CONFIRM_CANCEL: (id) => `${BASE_URL}/api/LeaveRequest/${id}/confirm-cancel`,
    REJECT_CANCEL: (id) => `${BASE_URL}/api/LeaveRequest/${id}/reject-cancel`,
  },

  // TODO: thêm endpoint thật khi backend có sẵn
  PRODUCT: {
    GET_ALL: `${BASE_URL}/api/Product/product-list`,
  },
};

export default BASE_URL;
