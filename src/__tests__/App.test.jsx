import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

vi.mock('@/routes', () => ({
  routes: [
    { path: '/', element: <div>Landing Mock</div> },
    { path: '/orders', element: <div>Orders Mock</div> },
  ],
}));

describe('App', () => {
  it('renders route element from routes config', () => {
    window.history.pushState({}, '', '/orders');

    render(<App />);

    expect(screen.getByText('Orders Mock')).toBeInTheDocument();
  });
});
