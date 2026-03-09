import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateOrder from '@/pages/orders/CreateOrder';
import OrderService from '@/services/OrderService';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../layouts/MainLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/AddMaterialModal', () => ({
  default: () => null,
}));

vi.mock('@/services/OrderService', () => ({
  default: {
    createOrder: vi.fn(),
  },
}));

describe('CreateOrder', () => {
  it('validates required fields before submit', async () => {
    const { container } = render(
      <MemoryRouter>
        <CreateOrder />
      </MemoryRouter>
    );

    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(OrderService.createOrder).not.toHaveBeenCalled();
    });
  });

  it('submits valid payload and redirects to orders list', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    OrderService.createOrder.mockResolvedValue({ data: {} });

    const { container } = render(
      <MemoryRouter>
        <CreateOrder />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="orderName"]'), { target: { value: 'Don hang A' } });
    fireEvent.change(container.querySelector('input[name="type"]'), { target: { value: 'Shirt' } });
    fireEvent.change(container.querySelector('input[name="size"]'), { target: { value: 'L' } });
    fireEvent.change(container.querySelector('input[name="color"]'), { target: { value: 'White' } });
    fireEvent.change(container.querySelector('input[name="quantity"]'), { target: { value: '50' } });

    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(OrderService.createOrder).toHaveBeenCalledTimes(1);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/orders');
  });
});
