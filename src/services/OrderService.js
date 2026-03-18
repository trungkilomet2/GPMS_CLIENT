import axiosClient from '../lib/axios';
import { API_ENDPOINTS } from '../lib/apiconfig';

const OrderService = {
    getAllOrders: (params) => {
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_ALL, params ? { params } : undefined);
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
    requestOrderModification: (orderId) => {
        return axiosClient.post(API_ENDPOINTS.ORDER.REQUEST_MODIFICATION(orderId));
    },
    rejectOrder: (payload) => {
        return axiosClient.post(API_ENDPOINTS.ORDER_REJECT.REJECT, payload);
    },
};

export default OrderService;
