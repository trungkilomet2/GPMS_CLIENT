import { act, render, screen } from '@testing-library/react';
import { useFadeIn } from '@/hooks/useFadeIn';

let ioCallback;

class MockIntersectionObserver {
  constructor(cb) {
    ioCallback = cb;
  }
  observe() {}
  disconnect() {}
}

function HookView() {
  const [ref, vis] = useFadeIn();
  return (
    <div>
      <div ref={ref}>target</div>
      <span>{vis ? 'visible' : 'hidden'}</span>
    </div>
  );
}

describe('useFadeIn', () => {
  beforeEach(() => {
    global.IntersectionObserver = MockIntersectionObserver;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb();
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 2000,
      bottom: 2100,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  it('becomes visible when intersection observer reports intersecting', () => {
    render(<HookView />);

    expect(screen.getByText('hidden')).toBeInTheDocument();

    act(() => {
      ioCallback([{ isIntersecting: true }]);
    });

    expect(screen.getByText('visible')).toBeInTheDocument();
  });
});
