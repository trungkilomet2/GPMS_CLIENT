import { render, screen } from '@testing-library/react';
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

  it('injects the Chative messenger script once', () => {
    render(<App />);

    const scripts = document.querySelectorAll(
      'script[src="https://messenger.svc.chative.io/static/v1.0/channels/s90b3b96e-842b-47ac-9482-1335b0ea5141/messenger.js?mode=livechat"]'
    );

    expect(scripts).toHaveLength(1);
  });
});
