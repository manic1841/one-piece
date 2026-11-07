import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AnalysisChart } from './AnalysisChart';
import { type AnalysisChartProps } from './AnalysisChart';
import { type ChartLayer } from './types';

interface Point {
  label: string;
  yearMonth: string;
  unclosed: boolean;
  value: number;
  rate: number;
}

type SeriesKey = 'base' | 'value' | 'rate';

const points: Point[] = [
  { label: 'JAN 2026', yearMonth: '2026-01', unclosed: false, value: 10, rate: 5 },
  { label: 'FEB 2026', yearMonth: '2026-02', unclosed: true, value: 20, rate: 6 },
  { label: 'MAR 2026', yearMonth: '2026-03', unclosed: true, value: 30, rate: 7 },
];

const renderChart = (overrides: Partial<AnalysisChartProps<SeriesKey, Point>> = {}) => {
  const onPointSelect = vi.fn();
  render(
    <AnalysisChart<SeriesKey, Point>
      points={points}
      selectedPeriod=""
      onPointSelect={onPointSelect}
      initialActive={['base', 'value', 'rate']}
      layers={(chartPoints) => {
        const layers: ChartLayer<SeriesKey>[] = [
          {
            kind: 'line',
            seriesKey: 'base',
            label: 'BASE',
            tone: 'neutral',
            values: chartPoints.map((point) => point.value),
          },
          {
            kind: 'bar',
            seriesKey: 'value',
            label: 'VALUE',
            tone: 'positive',
            values: chartPoints.map((point) => point.value),
          },
          {
            kind: 'band',
            seriesKey: 'rate',
            label: 'RATE',
            unit: 'RATE %',
            tone: 'neutral',
            values: chartPoints.map((point) => point.rate),
          },
        ];
        return layers;
      }}
      tooltip={(point) => ({
        primary: { id: 'value', seriesKey: 'value', label: 'VALUE', value: String(point.value) },
        secondary: [{ id: 'rate', seriesKey: 'rate', label: 'RATE', value: String(point.rate) }],
      })}
      showUnclosedLabels
      ariaLabel={(visible) => `chart ${visible.join(',')}`}
      {...overrides}
    />,
  );
  return { onPointSelect };
};

describe('AnalysisChart', () => {
  it('drops a hidden series from the tooltip but keeps the layer slot empty', () => {
    renderChart();

    fireEvent.click(screen.getByRole('button', { name: 'RATE' }));
    const chart = screen.getAllByRole('slider')[0];
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    const tooltip = within(chart).getByRole('tooltip');
    expect(tooltip.textContent).toContain('VALUE 10');
    expect(tooltip.textContent).not.toContain('RATE 5');
  });

  it('shows an em dash when the hidden series owned the primary value', () => {
    renderChart();

    fireEvent.click(screen.getByRole('button', { name: 'VALUE' }));
    const chart = screen.getAllByRole('slider')[0];
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    expect(within(chart).getByRole('tooltip').textContent).toContain('—');
  });

  it('passes only the visible labels to the accessibility name', () => {
    renderChart();

    expect(screen.getAllByRole('slider')[0].getAttribute('aria-label')).toBe(
      'chart BASE,VALUE,RATE',
    );
    fireEvent.click(screen.getByRole('button', { name: 'RATE' }));
    expect(screen.getAllByRole('slider')[0].getAttribute('aria-label')).toBe('chart BASE,VALUE');
  });

  it('builds the legend from the layers', () => {
    renderChart();

    expect(screen.getByRole('button', { name: 'BASE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'VALUE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RATE' })).toBeInTheDocument();
  });

  it('renders a secondary band without a legend entry', () => {
    renderChart({
      // A row keyed outside the layers cannot be toggled, so it always shows.
      tooltip: () => ({
        primary: { id: 'value', seriesKey: 'value', label: 'VALUE', value: '1' },
        secondary: [{ id: 'extra', seriesKey: 'extra', label: 'EXTRA', value: '2' }],
      }),
    });

    const chart = screen.getAllByRole('slider')[0];
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(within(chart).getByRole('tooltip').textContent).toContain('EXTRA 2');
  });

  it('labels one unclosed run once, and only when asked', () => {
    renderChart();
    expect(screen.getAllByText('未關帳')).toHaveLength(1);
    cleanup();

    renderChart({ showUnclosedLabels: false });
    expect(screen.queryByText('未關帳')).toBeNull();
  });

  it('keeps a single set of x labels while the lower band is present, then restores them', () => {
    renderChart();

    // One label per point: the visible rate band owns them.
    expect(screen.getAllByText('JAN 2026')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'RATE' }));
    expect(screen.getAllByText('JAN 2026')).toHaveLength(1);
  });

  it('activates the hovered point through the layer click', () => {
    const { onPointSelect } = renderChart();

    fireEvent.keyDown(screen.getAllByRole('slider')[0], { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getAllByRole('slider')[0], { key: 'Enter' });

    expect(onPointSelect).toHaveBeenCalledWith('2026-01');
  });
});
