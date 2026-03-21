import { fireEvent, render, waitFor } from '@testing-library/react';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '@/pages/RegisterPage';
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
    register: vi.fn(),
  },
}));

describe('RegisterPage', () => {
  it('submits valid register form and navigates to /login when confirmed', async () => {
    authService.register.mockResolvedValue({ message: 'ok' });

    const { container } = render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="fullName"]'), { target: { value: 'Nguyen Van A' } });
    fireEvent.change(container.querySelector('input[name="userName"]'), { target: { value: 'nva123' } });
    fireEvent.change(container.querySelector('input[name="password"]'), { target: { value: '123456' } });
    fireEvent.change(container.querySelector('input[name="confirmPassword"]'), { target: { value: '123456' } });
    fireEvent.click(container.querySelector('input[name="agree"]'));
    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        fullName: 'Nguyen Van A',
        userName: 'nva123',
        password: '123456',
        rePassword: '123456',
      });
    });

    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByText('Đăng nhập ngay'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('does not call register API when terms are not accepted', async () => {
    const { container } = render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(authService.register).not.toHaveBeenCalled();
    });
  });
});
