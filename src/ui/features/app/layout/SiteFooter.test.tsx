import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SiteFooter from './SiteFooter';

describe('SiteFooter', () => {
  it('renders the ONE PIECE brand, injected app version, and tagline', () => {
    render(<SiteFooter />);

    expect(screen.getByTestId('footer-brand').textContent).toBe('ONE PIECE');
    expect(screen.getByTestId('footer-version').textContent).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(screen.getByTestId('footer-tagline').textContent).toMatch(
      /data today, a freer tomorrow/i,
    );
  });
});
