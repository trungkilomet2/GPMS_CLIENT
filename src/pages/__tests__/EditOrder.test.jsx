import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditOrder from '@/pages/orders/EditOrder';
import OrderService from '@/services/OrderService';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '7' }),
  };
});

vi.mock('../../layouts/MainLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/orders/AddMaterialModal', () => ({
  default: () => null,
}));

vi.mock('@/services/OrderService', () => ({
  default: {
    getOrderDetail: vi.fn(),
    updateOrder: vi.fn(),
  },
}));

describe('EditOrder', () => {
  it('loads existing order and submits update', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    OrderService.getOrderDetail.mockResolvedValue({
      data: {
        data: {
          id: 7,
          orderName: 'Don hang cu',
          type: 'Shirt',
          size: 'M',
          color: 'Blue',
          startDate: '2026-03-01T00:00:00',
          endDate: '2026-03-10T00:00:00',
          quantity: 20,
          cpu: 100,
          status: 'pending',
          materials: [],
        },
      },
    });
    OrderService.updateOrder.mockResolvedValue({ data: {} });

    const { container } = render(
      <MemoryRouter>
        <EditOrder />
      </MemoryRouter>
    );

    await screen.findByDisplayValue('Don hang cu');

    fireEvent.change(container.querySelector('input[name="orderName"]'), { target: { value: 'Don hang moi' } });
    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(OrderService.updateOrder).toHaveBeenCalledWith(
        '7',
        expect.objectContaining({ orderName: 'Don hang moi' })
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/orders/detail/7');
  });
});
