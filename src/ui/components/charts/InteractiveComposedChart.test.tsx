import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InteractiveComposedChart } from './InteractiveComposedChart';
import { type ComposedSeries } from './composedChartGeometry';

const SERIES: ComposedSeries[] = [
  { kind: 'bar', tone: 'positive', values: [55, 70, 64] },
  { kind: 'bar', tone: 'negative', values: [-28, -34, -43] },
  { kind: 'line', tone: 'primary', values: [27, 36, 21], axis: 'right' },
];

const POINTS = [
  { title: '2026', value: 'INCOME +NT$55,000', meta: 'EXPENSE −NT$28,000' },
  { title: '2027', value: 'INCOME +NT$70,000', meta: 'EXPENSE −NT$34,000' },
  { title: '2028', value: 'INCOME +NT$64,000', meta: 'EXPENSE −NT$43,000' },
];

describe('InteractiveComposedChart', () => {
  it('exposes the columns as a keyboard-reachable slider', () => {
    render(
      <InteractiveComposedChart
        labels={['A', 'B', 'C']}
        series={SERIES}
        points={POINTS}
        ariaLabel="Cash flow projection"
      />,
    );

    const slider = screen.getByRole('slider', { name: 'Cash flow projection' });
    expect(slider.getAttribute('aria-valuemax')).toBe('2');
    expect(slider.getAttribute('tabindex')).toBe('0');
  });

  it('reveals the column tooltip as the arrow keys advance', () => {
    render(
      <InteractiveComposedChart
        labels={['A', 'B', 'C']}
        series={SERIES}
        points={POINTS}
        ariaLabel="Cash flow projection"
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Cash flow projection' });

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByText('2027')).toBeDefined();
    expect(slider.getAttribute('aria-valuenow')).toBe('1');
    expect(slider.getAttribute('aria-valuetext')).toBe(
      '2027, INCOME +NT$70,000, EXPENSE −NT$34,000',
    );
  });

  it('clears the tooltip with Escape', () => {
    render(
      <InteractiveComposedChart
        labels={['A', 'B', 'C']}
        series={SERIES}
        points={POINTS}
        ariaLabel="Cash flow projection"
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Cash flow projection' });

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByText('2026')).toBeDefined();
    fireEvent.keyDown(slider, { key: 'Escape' });
    expect(screen.queryByText('2026')).toBeNull();
  });

  it('selects the column under the pointer and clears it on leave', () => {
    render(
      <InteractiveComposedChart
        labels={['A', 'B', 'C']}
        series={SERIES}
        points={POINTS}
        ariaLabel="Cash flow projection"
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Cash flow projection' });
    slider.getBoundingClientRect = () => ({ left: 0, width: 300 }) as DOMRect;

    fireEvent.mouseMove(slider, { clientX: 300 });
    expect(screen.getByText('2028')).toBeDefined();

    fireEvent.mouseLeave(slider);
    expect(screen.queryByText('2028')).toBeNull();
  });
});
