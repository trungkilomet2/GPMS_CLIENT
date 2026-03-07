import axiosClient from '../lib/axios';
import { API_ENDPOINTS } from '../lib/apiconfig';

const OrderService = {
    getAllOrders: () => {
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_ALL);
    },
    getOrderDetail: (id) => {
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_DETAIL(id));
    },
    getUpdateOrderHistory: (orderId) => {
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_UPDATE_ORDER_HISTORY(orderId));
    },
    createOrder: (orderData) => {
        return axiosClient.post(API_ENDPOINTS.ORDER.CREATE_ORDER, orderData);
    },
}

export default OrderService;