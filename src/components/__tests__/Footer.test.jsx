import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from '@/components/Footer';

describe('Footer', () => {
  it('renders key sections', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getByText(/Garment Production Management System/i)).toBeInTheDocument();
    expect(screen.getByText(/Menu/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Liên hệ/i).length).toBeGreaterThan(0);
  });
});
