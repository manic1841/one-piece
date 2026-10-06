import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BarChart } from './BarChart';

const SERIES = [
  { tone: 'positive' as const, values: [55, 70, 64] },
  { tone: 'negative' as const, values: [28, 34, 43] },
];

/** Bars are the only elements with a percentage inline height. */
const barsOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('div[style*="%"]'));

describe('BarChart', () => {
  it('renders one bar per series per column', () => {
    const { container } = render(<BarChart labels={['APR', 'MAY', 'JUN']} series={SERIES} />);

    expect(barsOf(container)).toHaveLength(6);
    expect(screen.getByText('APR')).toBeDefined();
    expect(screen.getByText('JUN')).toBeDefined();
  });

  it('scales bar heights against the largest value in the chart', () => {
    const { container } = render(<BarChart labels={['APR', 'MAY']} series={SERIES} />);

    const bars = barsOf(container);
    // MAY income (70) is the maximum and fills the plot; APR expense (28) is 40%.
    expect(bars[2].style.height).toBe('100%');
    expect(bars[1].style.height).toBe('40%');
  });

  it('repaints the highlighted column in the primary tone', () => {
    const { container } = render(
      <BarChart labels={['APR', 'MAY']} series={SERIES} highlightIndex={1} />,
    );

    const bars = barsOf(container);
    expect(bars[0].className).toContain('bg-positive');
    expect(bars[2].className).toContain('bg-primary');
  });

  it('keeps a minimum bar height so a zero value stays visible', () => {
    const { container } = render(
      <BarChart labels={['APR']} series={[{ tone: 'neutral', values: [0] }]} />,
    );

    expect(barsOf(container)[0].style.height).toBe('2%');
  });

  it('can hide the column labels', () => {
    render(<BarChart labels={['APR']} series={SERIES} showLabels={false} />);

    expect(screen.queryByText('APR')).toBeNull();
  });

  it('exposes each column layout to the overlay renderer', () => {
    const seen: Array<{ index: number; values: number[]; ratio: number }> = [];
    render(
      <BarChart labels={['APR', 'MAY']} series={SERIES}>
        {(layout) => {
          seen.push(...layout.columns);
          return null;
        }}
      </BarChart>,
    );

    expect(seen).toHaveLength(2);
    expect(seen[1]).toMatchObject({ index: 1, values: [70, 34], ratio: 1 });
    expect(seen[0].ratio).toBeCloseTo(55 / 70);
  });

  it('drops the img role once an overlay owns the semantics', () => {
    render(
      <BarChart labels={['APR']} series={SERIES} ariaLabel="Monthly cash flow">
        {() => null}
      </BarChart>,
    );

    expect(screen.queryByRole('img')).toBeNull();
  });
});
