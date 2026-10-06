import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InteractiveBarChart } from './InteractiveBarChart';

const LABELS = ['APR', 'MAY', 'JUN'];
const SERIES = [
  { tone: 'positive' as const, values: [55, 70, 64] },
  { tone: 'negative' as const, values: [28, 34, 43] },
];
const POINTS = [
  { title: 'APR 2026', value: 'INCOME +NT$55,000', meta: 'EXPENSE −NT$28,000' },
  { title: 'MAY 2026', value: 'INCOME +NT$70,000', meta: 'EXPENSE −NT$34,000' },
  { title: 'JUN 2026', value: 'INCOME +NT$64,000', meta: 'EXPENSE −NT$43,000' },
];

const renderChart = () =>
  render(
    <InteractiveBarChart
      labels={LABELS}
      series={SERIES}
      points={POINTS}
      ariaLabel="Monthly cash flow with detail"
    />,
  );

const sliderOf = () => screen.getByRole('slider');
const columnsOf = (slider: HTMLElement) => Array.from(slider.children) as HTMLElement[];

describe('InteractiveBarChart', () => {
  it('exposes the bar area as a labelled slider', () => {
    renderChart();

    const slider = sliderOf();
    expect(slider.getAttribute('aria-label')).toBe('Monthly cash flow with detail');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('2');
  });

  it('has no tooltip until a column is selected', () => {
    renderChart();

    expect(screen.queryByText('MAY 2026')).toBeNull();
  });

  it('selects columns with the arrow keys', () => {
    renderChart();

    fireEvent.keyDown(sliderOf(), { key: 'ArrowRight' });
    expect(screen.getByText('APR 2026')).toBeDefined();
    expect(sliderOf().getAttribute('aria-valuenow')).toBe('0');

    fireEvent.keyDown(sliderOf(), { key: 'ArrowRight' });
    expect(screen.getByText('MAY 2026')).toBeDefined();
    expect(sliderOf().getAttribute('aria-valuenow')).toBe('1');
    expect(sliderOf().getAttribute('aria-valuetext')).toBe(
      'MAY 2026, INCOME +NT$70,000, EXPENSE −NT$34,000',
    );
  });

  it('clamps arrow navigation at the ends', () => {
    renderChart();

    fireEvent.keyDown(sliderOf(), { key: 'ArrowLeft' });
    expect(sliderOf().getAttribute('aria-valuenow')).toBe('0');
  });

  it('clears the tooltip on Escape', () => {
    renderChart();

    fireEvent.keyDown(sliderOf(), { key: 'ArrowRight' });
    expect(screen.getByText('APR 2026')).toBeDefined();

    fireEvent.keyDown(sliderOf(), { key: 'Escape' });
    expect(screen.queryByText('APR 2026')).toBeNull();
    expect(sliderOf().getAttribute('aria-valuetext')).toBeNull();
  });

  it('selects the column under the pointer', () => {
    renderChart();

    const slider = sliderOf();
    const columns = columnsOf(slider);
    columns[1].getBoundingClientRect = () => ({ left: 100, right: 200 }) as DOMRect;

    fireEvent.mouseMove(slider, { clientX: 150 });

    expect(screen.getByText('MAY 2026')).toBeDefined();
    expect(slider.getAttribute('aria-valuenow')).toBe('1');
  });
});
