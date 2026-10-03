import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DonutChart } from './DonutChart';
import { buildDonutSlices } from './donutSlices';

const SEGMENTS = [
  { label: 'Equities', value: 42 },
  { label: 'Cash', value: 25 },
  { label: 'Bonds', value: 17 },
  { label: 'Other', value: 16 },
];

describe('DonutChart', () => {
  it('builds a conic-gradient covering 0–100% from the shares', () => {
    const stops = buildDonutSlices(SEGMENTS).map((slice) => slice.stop);

    expect(stops).toEqual([
      'hsl(var(--primary)) 0% 42%',
      'hsl(var(--border-strong)) 42% 67%',
      'hsl(var(--border)) 67% 84%',
      'hsl(var(--muted)) 84% 100%',
    ]);
  });

  it('shares one color per slice between the ring and its legend', () => {
    const { container } = render(<DonutChart segments={SEGMENTS} centerLabel="100%" />);

    const sliceColors = buildDonutSlices(SEGMENTS).map((slice) => slice.color);
    const swatches = Array.from(
      container.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'),
    );

    expect(swatches.map((swatch) => swatch.style.background)).toEqual(sliceColors);
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
    const slices = buildDonutSlices([{ label: 'None', value: 0 }]);

    expect(slices).toHaveLength(1);
    expect(slices[0].stop).toBe('hsl(var(--primary)) 0% 0%');
  });
});
