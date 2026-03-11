import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import { authService } from '@/services/authService';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/services/authService', () => ({
  authService: {
    login: vi.fn(),
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('submits login form and navigates to /home', async () => {
    authService.login.mockResolvedValue({
      token: 'token-1',
      user: { id: 1, name: 'Tester' },
    });

    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="userName"]'), {
      target: { value: 'tester01' },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: '123456' },
    });
    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        userName: 'tester01',
        password: '123456',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });

  it('does not call login API when form is invalid', async () => {
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  it('shows field errors when login credentials are invalid', async () => {
    authService.login.mockRejectedValue({
      response: {
        data: {
          message: 'Tài khoản hoặc mật khẩu không chính xác',
        },
      },
    });

    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="userName"]'), {
      target: { value: 'tester01' },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: '123456' },
    });
    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(screen.getAllByText('Tài khoản hoặc mật khẩu không chính xác')).toHaveLength(2);
    });
  });
});
