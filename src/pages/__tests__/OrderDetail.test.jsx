import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderDetail from '@/pages/orders/OrderDetail';
import OrderService from '@/services/OrderService';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '123' }),
  };
});

vi.mock('../../layouts/MainLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/orders/OrderCommentModal', () => ({
  default: ({ isOpen }) => (isOpen ? <div>Comment Modal Open</div> : null),
}));

vi.mock('@/components/orders/OrderHistoryUpdateModal', () => ({
  default: ({ isOpen }) => (isOpen ? <div>History Modal Open</div> : null),
}));

vi.mock('@/services/OrderService', () => ({
  default: {
    getOrderDetail: vi.fn(),
  },
}));

describe('OrderDetail', () => {
  it('loads and displays order detail data', async () => {
    OrderService.getOrderDetail.mockResolvedValue({
      data: {
        data: {
          id: 123,
          orderName: 'Ao khoac gio',
          type: 'Jacket',
          size: 'L',
          color: 'Den',
          quantity: 100,
          status: 'pending',
          materials: [],
          files: [],
        },
      },
    });

    render(
      <MemoryRouter>
        <OrderDetail />
      </MemoryRouter>
    );

    const title = await screen.findByRole('heading', { level: 1 });
    expect(title.textContent).toContain('#123');
    expect(screen.getByText('Ao khoac gio')).toBeInTheDocument();
  });

  it('opens comment and history modals', async () => {
    OrderService.getOrderDetail.mockResolvedValue({
      data: { data: { id: 123, orderName: 'A', status: 'pending', materials: [], files: [] } },
    });

    render(
      <MemoryRouter>
        <OrderDetail />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { level: 1 });

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);
    fireEvent.click(buttons[3]);

    await waitFor(() => {
      expect(screen.getByText('Comment Modal Open')).toBeInTheDocument();
      expect(screen.getByText('History Modal Open')).toBeInTheDocument();
    });
  });
});
