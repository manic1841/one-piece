import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ComposedChart } from './ComposedChart';
import { type ComposedSeries } from './composedChartGeometry';

const SERIES: ComposedSeries[] = [
  { kind: 'bar', tone: 'positive', values: [55, 70, 64] },
  { kind: 'bar', tone: 'negative', values: [-28, -34, -43] },
  { kind: 'line', tone: 'primary', values: [27, 36, 21], axis: 'right' },
];

describe('ComposedChart', () => {
  it('renders one rect per bar series per column and one path per line', () => {
    const { container } = render(<ComposedChart labels={['A', 'B', 'C']} series={SERIES} />);

    expect(container.querySelectorAll('rect')).toHaveLength(6);
    expect(container.querySelectorAll('path')).toHaveLength(1);
    expect(screen.getByText('A')).toBeDefined();
    expect(screen.getByText('C')).toBeDefined();
  });

  it('draws an area path when a line requests one', () => {
    const { container } = render(
      <ComposedChart
        labels={['A', 'B']}
        series={[{ kind: 'line', tone: 'primary', values: [1, 2], area: true }]}
      />,
    );

    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('fills every area with its own single-colour gradient', () => {
    const { container } = render(
      <ComposedChart
        labels={['A', 'B']}
        series={[
          { kind: 'line', tone: 'positive', area: true, values: [10, 20] },
          {
            kind: 'line',
            tone: 'investment',
            area: true,
            values: [14, 26],
            baselineValues: [10, 20],
          },
        ]}
      />,
    );

    const gradients = container.querySelectorAll('linearGradient');
    expect(gradients).toHaveLength(2);
    // Ids and colours are per series, so the bands stay tellable apart.
    expect(gradients[0].id).not.toBe(gradients[1].id);
    const stops = [...container.querySelectorAll('linearGradient')[0].querySelectorAll('stop')].map(
      (stop) => stop.getAttribute('stop-color'),
    );
    expect(stops[0]).toBe('hsl(var(--positive))');
    const areaFills = [...container.querySelectorAll('path')].map((path) =>
      path.getAttribute('fill'),
    );
    expect(areaFills).toContain(`url(#${gradients[0].id})`);
    expect(areaFills).toContain(`url(#${gradients[1].id})`);
  });

  it('renders both axis label columns for a dual-axis chart', () => {
    const dualSeries: ComposedSeries[] = [
      { kind: 'bar', tone: 'positive', values: [55_000, 70_000] },
      { kind: 'line', tone: 'primary', values: [1_000_000, 2_000_000], axis: 'right' },
    ];
    const { container } = render(<ComposedChart labels={['A', 'B']} series={dualSeries} />);

    // The left axis ticks in thousands while the right axis ticks in millions.
    expect(container.textContent).toContain('K');
    expect(container.textContent).toContain('M');
  });

  it('marks the requested column with a reference line and caption', () => {
    const { container } = render(
      <ComposedChart
        labels={['A', 'B', 'C']}
        series={SERIES}
        referenceLines={[{ index: 1, tone: 'primary', label: 'Retirement' }]}
      />,
    );

    const dashed = Array.from(container.querySelectorAll('line')).filter((line) =>
      line.getAttribute('stroke-dasharray'),
    );
    expect(dashed.length).toBeGreaterThan(0);
    expect(screen.getByText('Retirement')).toBeDefined();
  });

  it('exposes the layout to the overlay renderer', () => {
    const seen: number[] = [];
    render(
      <ComposedChart labels={['A', 'B', 'C']} series={SERIES}>
        {(layout) => {
          seen.push(layout.columns.length);
          return null;
        }}
      </ComposedChart>,
    );

    expect(seen).toEqual([3]);
  });

  it('drops the img role once an overlay owns the semantics', () => {
    render(
      <ComposedChart labels={['A']} series={SERIES} ariaLabel="Cash flow">
        {() => null}
      </ComposedChart>,
    );

    expect(screen.queryByRole('img')).toBeNull();
  });

  it('labels the plot for assistive tech when no overlay is present', () => {
    render(<ComposedChart labels={['A']} series={SERIES} ariaLabel="Cash flow" />);

    expect(screen.getByRole('img', { name: 'Cash flow' })).toBeDefined();
  });
});
