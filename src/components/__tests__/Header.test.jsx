import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '@/components/Header';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Header', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
  });

  it('shows login/register for guest and navigates to login', () => {
    const { container } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[2]);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows user menu when user exists and can logout', () => {
    localStorage.setItem('user', JSON.stringify({ name: 'Tester', email: 't@mail.com' }));

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /tester/i }));
    fireEvent.click(screen.getByRole('link', { name: /đăng xuất/i }));

    expect(localStorage.getItem('user')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
