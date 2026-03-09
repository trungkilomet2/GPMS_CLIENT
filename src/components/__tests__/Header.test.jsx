import { fireEvent, render } from '@testing-library/react';
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

    const { container } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const avatarButton = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Tester'));
    fireEvent.click(avatarButton);

    const logoutLink = Array.from(container.querySelectorAll('a')).find((a) => a.textContent.includes('Đăng xuất'));
    fireEvent.click(logoutLink);

    expect(localStorage.getItem('user')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });
});
