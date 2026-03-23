import axiosClient from '../lib/axios';
import { API_ENDPOINTS } from '../lib/apiconfig';

const OrderService = {
    getAllOrders: (params, config = {}) => {
        const requestConfig = params ? { params, ...config } : config;
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_ALL, requestConfig);
    },
    getOrderDetail: (id) => {
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_DETAIL(id));
    },
    getOrdersByUser: (params) => {
        const config = params ? { params } : undefined;
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_ORDERS_BY_USER, config);
    },
    getUpdateOrderHistory: (orderId) => {
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_UPDATE_ORDER_HISTORY(orderId));
    },
    createOrder: (orderData) => {
        return axiosClient.post(API_ENDPOINTS.ORDER.CREATE_ORDER, orderData);
    },
    updateOrder: (orderId, orderData) => {
        return axiosClient.put(API_ENDPOINTS.ORDER.UPDATE_ORDER(orderId), orderData);
    },
    approveOrder: async (orderId) => {
        try {
            return await axiosClient.put(API_ENDPOINTS.ORDER.APPROVE_ORDER(orderId));
        } catch (err) {
            const status = err?.response?.status;
            if (status === 405 || status === 404) {
                return axiosClient.post(API_ENDPOINTS.ORDER.APPROVE_ORDER(orderId));
            }
            throw err;
        }
    },
    requestOrderModification: async (orderId, payload = {}) => {
        try {
            return await axiosClient.put(API_ENDPOINTS.ORDER.REQUEST_MODIFICATION(orderId), payload);
        } catch (err) {
            const status = err?.response?.status;
            if (status === 405 || status === 404) {
                return axiosClient.post(API_ENDPOINTS.ORDER.REQUEST_MODIFICATION(orderId), payload);
            }
            throw err;
        }
    },
    denyOrder: async (orderId) => {
        try {
            return await axiosClient.put(API_ENDPOINTS.ORDER.DENY_ORDER(orderId));
        } catch (err) {
            const status = err?.response?.status;
            if (status === 405 || status === 404) {
                return axiosClient.post(API_ENDPOINTS.ORDER.DENY_ORDER(orderId));
            }
            throw err;
        }
    },
    rejectOrder: async (payload) => {
        try {
            return await axiosClient.post(API_ENDPOINTS.ORDER_REJECT.REJECT, payload);
        } catch (err) {
            const status = err?.response?.status;
            if (status !== 400 && status !== 405) throw err;
            const orderId = payload?.orderId ?? payload?.id ?? payload?.orderID;
            const reason = payload?.reason ?? payload?.note ?? payload?.message ?? "";
            const userId = payload?.userId ?? payload?.userID ?? payload?.actorId ?? payload?.actorID ?? payload?.createdBy;
            const fallbackPayload = {
                id: orderId ?? 0,
                orderId: orderId ?? 0,
                userId: userId ?? 0,
                reason,
                note: reason,
                statusId: payload?.statusId ?? 0,
                statusName: payload?.statusName ?? "Từ chối",
            };
            try {
                return await axiosClient.post(API_ENDPOINTS.ORDER_REJECT.REJECT, fallbackPayload);
            } catch (err2) {
                if (status === 405) {
                    return axiosClient.put(API_ENDPOINTS.ORDER_REJECT.REJECT, fallbackPayload);
                }
                throw err2;
            }
        }
    },
};

export default OrderService;
