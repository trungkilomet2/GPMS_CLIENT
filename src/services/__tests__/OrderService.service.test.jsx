import OrderService from '@/services/OrderService';
import axiosClient from '@/lib/axios';
import { API_ENDPOINTS } from '@/lib/apiconfig';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('OrderService', () => {
  it('calls getAllOrders endpoint', () => {
    OrderService.getAllOrders();
    expect(axiosClient.get).toHaveBeenCalledWith(API_ENDPOINTS.ORDER.GET_ALL);
  });

  it('calls getOrderDetail endpoint', () => {
    OrderService.getOrderDetail(7);
    expect(axiosClient.get).toHaveBeenCalledWith(API_ENDPOINTS.ORDER.GET_DETAIL(7));
  });

  it('calls getUpdateOrderHistory endpoint', () => {
    OrderService.getUpdateOrderHistory(7);
    expect(axiosClient.get).toHaveBeenCalledWith(API_ENDPOINTS.ORDER.GET_UPDATE_ORDER_HISTORY(7));
  });

  it('calls createOrder endpoint with payload', () => {
    const payload = { orderName: 'A' };
    OrderService.createOrder(payload);
    expect(axiosClient.post).toHaveBeenCalledWith(API_ENDPOINTS.ORDER.CREATE_ORDER, payload);
  });

  it('calls updateOrder endpoint with payload', () => {
    const payload = { orderName: 'B' };
    OrderService.updateOrder(9, payload);
    expect(axiosClient.put).toHaveBeenCalledWith(API_ENDPOINTS.ORDER.UPDATE_ORDER(9), payload);
  });
});
