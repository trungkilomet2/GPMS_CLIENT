import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ViewProfile from '@/pages/profile/ViewProfile';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ViewProfile', () => {
  it('reads user from localStorage and switches tabs', () => {
    localStorage.setItem('user', JSON.stringify({ name: 'Tran Van B', email: 'b@test.com' }));

    const { container } = render(
      <MemoryRouter>
        <ViewProfile />
      </MemoryRouter>
    );

    expect(container.textContent).toContain('Tran Van B');

    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[3]);

    expect(container.querySelectorAll('input[type="password"]')).toHaveLength(3);
  });
});
