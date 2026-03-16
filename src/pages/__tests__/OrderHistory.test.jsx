import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderHistory from '@/pages/orders/OrderHistory';
import OrderService from '@/services/OrderService';

vi.mock('../../layouts/MainLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/services/OrderService', () => ({
  default: {
    getAllOrders: vi.fn(),
  },
}));

describe('OrderHistory', () => {
  it('renders orders and filters by search text', async () => {
    OrderService.getAllOrders.mockResolvedValue({
      data: [
        { id: 1, orderName: 'Ao so mi', size: 'L', color: 'Trang', quantity: 10, endDate: '2026-03-20', status: 'pending' },
        { id: 2, orderName: 'Quan jean', size: 'M', color: 'Xanh', quantity: 20, endDate: '2026-03-25', status: 'completed' },
      ],
    });

    const { container } = render(
      <MemoryRouter>
        <OrderHistory />
      </MemoryRouter>
    );

    expect(await screen.findByText('Ao so mi')).toBeInTheDocument();
    expect(screen.getByText('Quan jean')).toBeInTheDocument();

    fireEvent.change(container.querySelector('input[placeholder]'), {
      target: { value: 'jean' },
    });

    await waitFor(() => {
      expect(screen.getByText('Quan jean')).toBeInTheDocument();
      expect(screen.queryByText('Ao so mi')).not.toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    OrderService.getAllOrders.mockRejectedValue(new Error('network error'));

    const { container } = render(
      <MemoryRouter>
        <OrderHistory />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(container.querySelector('td.text-red-600')).toBeInTheDocument();
    });
  });
});
