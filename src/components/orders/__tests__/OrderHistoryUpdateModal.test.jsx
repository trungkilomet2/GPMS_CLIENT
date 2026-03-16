import { render, waitFor } from '@testing-library/react';
import OrderHistoryUpdateModal from '@/components/orders/OrderHistoryUpdateModal';
import OrderService from '@/services/OrderService';

vi.mock('@/services/OrderService', () => ({
  default: {
    getUpdateOrderHistory: vi.fn(),
  },
}));

describe('OrderHistoryUpdateModal', () => {
  it('loads and renders history data when opened', async () => {
    OrderService.getUpdateOrderHistory.mockResolvedValue({
      data: [{ id: 1, fieldName: 'status', oldValue: 'pending', newValue: 'completed' }],
    });

    const { container } = render(
      <OrderHistoryUpdateModal isOpen onClose={vi.fn()} orderId={5} />
    );

    await waitFor(() => {
      expect(OrderService.getUpdateOrderHistory).toHaveBeenCalledWith(5);
    });

    expect(container.textContent).toContain('status');
    expect(container.textContent).toContain('completed');
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <OrderHistoryUpdateModal isOpen={false} onClose={vi.fn()} orderId={5} />
    );

    expect(container.firstChild).toBeNull();
  });
});
