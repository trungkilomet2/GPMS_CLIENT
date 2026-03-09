import { authService } from '@/services/authService';

describe('authService', () => {
  it('login stores user and dispatches auth-change', async () => {
    const eventSpy = vi.spyOn(window, 'dispatchEvent');

    const result = await authService.login({ loginId: 'user@mail.com', password: '123456' });

    const storedUser = JSON.parse(localStorage.getItem('user'));
    expect(storedUser.email).toBe('user@mail.com');
    expect(result.success).toBe(true);
    expect(eventSpy).toHaveBeenCalled();
  });

  it('register stores user and dispatches auth-change', async () => {
    const eventSpy = vi.spyOn(window, 'dispatchEvent');

    const result = await authService.register({ fullName: 'Tester', email: 't@mail.com' });

    const storedUser = JSON.parse(localStorage.getItem('user'));
    expect(storedUser.name).toBe('Tester');
    expect(result.success).toBe(true);
    expect(eventSpy).toHaveBeenCalled();
  });

  it('logout clears user and dispatches auth-change', () => {
    const eventSpy = vi.spyOn(window, 'dispatchEvent');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));

    authService.logout();

    expect(localStorage.getItem('user')).toBeNull();
    expect(eventSpy).toHaveBeenCalled();
  });
});
