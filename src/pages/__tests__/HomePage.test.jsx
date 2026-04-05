import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '@/pages/HomePage';

vi.mock('@/layouts/MainLayout', () => ({
  default: ({ children }) => <div data-testid="main-layout">{children}</div>,
}));
vi.mock('@/components/homepage/Hero', () => ({ default: () => <div>Hero Section</div> }));
vi.mock('@/components/homepage/Intro', () => ({ default: () => <div>Intro Section</div> }));
vi.mock('@/components/homepage/Products', () => ({ default: () => <div>Products Section</div> }));
vi.mock('@/components/homepage/Features', () => ({ default: () => <div>Features Section</div> }));
vi.mock('@/components/homepage/Process', () => ({ default: () => <div>Process Section</div> }));
vi.mock('@/components/homepage/CTA', () => ({ default: () => <div>CTA Section</div> }));
vi.mock('@/services/productService', () => ({
  productService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/lib/authStorage', () => ({
  getStoredUser: () => null,
}));

describe('HomePage', () => {
  it('renders all homepage sections inside MainLayout', async () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
      expect(screen.getByText('Hero Section')).toBeInTheDocument();
      expect(screen.getByText('Intro Section')).toBeInTheDocument();
      expect(screen.getByText('Products Section')).toBeInTheDocument();
      expect(screen.getByText('Features Section')).toBeInTheDocument();
      expect(screen.getByText('Process Section')).toBeInTheDocument();
      expect(screen.getByText('CTA Section')).toBeInTheDocument();
    });
  });
});
