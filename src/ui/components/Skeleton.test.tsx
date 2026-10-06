import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders a single aria-hidden shimmer block', () => {
    const { container } = render(<Skeleton className="h-8 w-40" />);

    const block = container.firstElementChild as HTMLElement;
    expect(block.getAttribute('aria-hidden')).toBe('true');
    expect(block.className).toContain('animate-pulse');
    expect(block.className).toContain('bg-muted');
  });

  it('accepts sizing overrides via className', () => {
    const { container } = render(<Skeleton className="h-12" />);

    expect((container.firstElementChild as HTMLElement).className).toContain('h-12');
  });
});
