import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Breadcrumbs from '@/components/Breadcrumbs';

describe('Breadcrumbs', () => {
  it('does not render on home page', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/home']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders breadcrumb on nested path', () => {
    render(
      <MemoryRouter initialEntries={['/orders/detail/5']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByText('Trang chủ')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Chi tiết đơn #5')).toBeInTheDocument();
  });
});
