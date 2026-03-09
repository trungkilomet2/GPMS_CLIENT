import { render, screen } from '@testing-library/react';
import MainLayout from '@/layouts/MainLayout';

vi.mock('@/components/Header', () => ({ default: () => <div>Header Mock</div> }));
vi.mock('@/components/Footer', () => ({ default: () => <div>Footer Mock</div> }));
vi.mock('@/components/Breadcrumbs', () => ({ default: () => <div>Breadcrumbs Mock</div> }));

describe('MainLayout', () => {
  it('renders layout slots and children', () => {
    render(
      <MainLayout>
        <div>Child Content</div>
      </MainLayout>
    );

    expect(screen.getByText('Header Mock')).toBeInTheDocument();
    expect(screen.getByText('Breadcrumbs Mock')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
    expect(screen.getByText('Footer Mock')).toBeInTheDocument();
  });
});
