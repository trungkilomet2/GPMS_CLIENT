import { axiosClient } from '../lib/axios';
import { API_ENDPOINTS } from '../lib/apiconfig';

const OrderService = {
    getAllOrders: () => {
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_ALL);
    },
    getOrderDetail: (id) => {
        return axiosClient.get(API_ENDPOINTS.ORDER.GET_DETAIL(id));
    }
}

export default OrderService;