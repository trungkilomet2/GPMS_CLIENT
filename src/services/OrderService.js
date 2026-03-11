import axiosClient from '../lib/axios';
import { API_ENDPOINTS } from '../lib/apiconfig';

const OrderService = {
    getAllOrders: () => {
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_ALL);
    },
    getOrderDetail: (id) => {
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_DETAIL(id));
    },
    getOrdersByUser: (userId, params) => {
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_ORDERS_BY_USER(userId), { params });
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
};

export default OrderService;
