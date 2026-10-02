import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DonutChart } from './DonutChart';

const SEGMENTS = [
  { label: 'Equities', value: 42 },
  { label: 'Cash', value: 25 },
  { label: 'Bonds', value: 17 },
  { label: 'Other', value: 16 },
];

describe('DonutChart', () => {
  it('builds a conic-gradient covering 0–100% from the shares', () => {
    const { container } = render(<DonutChart segments={SEGMENTS} centerLabel="100%" />);

    const ring = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(ring.style.background).toContain('conic-gradient');
    expect(ring.style.background).toContain('0% 42%');
    expect(ring.style.background).toContain('42% 67%');
    expect(ring.style.background).toContain('100%');
  });

  it('shares one color per slice between the ring and its legend', () => {
    const { container } = render(<DonutChart segments={SEGMENTS} centerLabel="100%" />);

    const ring = container.firstElementChild?.firstElementChild as HTMLElement;
    const swatches = Array.from(
      container.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'),
    );
    expect(ring.style.background).toContain('hsl(var(--primary))');
    expect(swatches[0].style.background).toBe('hsl(var(--primary))');
    expect(swatches[1].style.background).toBe('hsl(var(--border-strong))');
  });

  it('labels each legend row with its rounded share', () => {
    render(<DonutChart segments={SEGMENTS} centerLabel="100%" />);

    expect(screen.getByText('Equities')).toBeDefined();
    expect(screen.getByText('42%')).toBeDefined();
    expect(screen.getByText('16%')).toBeDefined();
  });

  it('renders the center caption', () => {
    render(<DonutChart segments={SEGMENTS} centerLabel="100%" />);

    expect(screen.getByText('100%')).toBeDefined();
  });

  it('can hide the legend', () => {
    render(<DonutChart segments={SEGMENTS} centerLabel="100%" showLegend={false} />);

    expect(screen.queryByText('Equities')).toBeNull();
  });

  it('does not divide by zero when every value is zero', () => {
    const { container } = render(
      <DonutChart segments={[{ label: 'None', value: 0 }]} centerLabel="0%" />,
    );

    const ring = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(ring.style.background).toContain('0% 0%');
  });
});
