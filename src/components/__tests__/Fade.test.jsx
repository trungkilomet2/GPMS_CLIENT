import { render } from '@testing-library/react';
import Fade from '@/components/Fade';

vi.mock('@/hooks/useFadeIn', () => ({
  useFadeIn: () => [{ current: null }, true],
}));

describe('Fade', () => {
  it('renders children', () => {
    const { container } = render(
      <Fade>
        <div>Fade Child</div>
      </Fade>
    );

    expect(container.textContent).toContain('Fade Child');
  });
});
