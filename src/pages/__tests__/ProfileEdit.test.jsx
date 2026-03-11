import { act, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileEdit from '@/pages/profile/ProfileEdit';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProfileEdit', () => {
  it('updates user in sessionStorage and redirects to /profile', () => {
    vi.useFakeTimers();
    sessionStorage.setItem('user', JSON.stringify({ name: 'Old Name', email: 'old@test.com' }));

    const { container } = render(
      <MemoryRouter>
        <ProfileEdit />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="name"]'), {
      target: { value: 'New Name' },
    });
    fireEvent.click(container.querySelector('button[type="submit"]'));

    const savedUser = JSON.parse(sessionStorage.getItem('user'));
    expect(savedUser.name).toBe('New Name');

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/profile');
    vi.useRealTimers();
  });
});
