import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { stubViewportWidth } from '@/ui/test/viewport';

import { AXIS_GUTTER_CLASS } from './ChartAxisGutter';
import { LineChart } from './LineChart';

let restoreViewport: (() => void) | undefined;

afterEach(() => {
  restoreViewport?.();
  restoreViewport = undefined;
});

describe('LineChart', () => {
  it('exposes the chart as a labelled image when an aria label is given', () => {
    render(<LineChart ariaLabel="12M net worth" values={[1, 2, 3]} />);

    expect(screen.getByRole('img', { name: '12M net worth' })).toBeDefined();
  });

  it('draws one gridline per scale step and a single series path', () => {
    const { container } = render(<LineChart values={[10, 20, 30]} />);

    expect(container.querySelectorAll('line')).toHaveLength(4);
    expect(container.querySelectorAll('path')).toHaveLength(1);
  });

  it('adds an area path and a last-point marker on request', () => {
    const { container } = render(<LineChart values={[10, 20, 30]} showArea markLastPoint />);

    expect(container.querySelectorAll('path')).toHaveLength(2);
    expect(container.querySelectorAll('circle')).toHaveLength(1);
  });

  it('renders axis labels beneath the plot, not inside the svg', () => {
    const { container } = render(<LineChart values={[1, 2, 3]} labels={['JAN', 'FEB', 'MAR']} />);

    expect(screen.getByText('JAN')).toBeDefined();
    expect(screen.getByText('MAR')).toBeDefined();
    expect(container.querySelector('svg')?.textContent).toBe('');
  });

  it('gives the overlay renderer the computed geometry', () => {
    render(
      <LineChart values={[1, 2, 3]}>
        {(geometry) => <span data-testid="overlay">{geometry.points.length}</span>}
      </LineChart>,
    );

    expect(screen.getByTestId('overlay').textContent).toBe('3');
  });

  it('puts y labels in their own gutter beside the plot, never over it', () => {
    const { container } = render(<LineChart values={[10, 20, 30]} yAxis="left" />);
    const gutter = screen.getByTestId('chart-axis-left');
    const svg = container.querySelector('svg');

    expect(gutter.contains(svg)).toBe(false);
    expect(gutter.querySelectorAll('span').length).toBeGreaterThan(1);
  });

  it('keeps a gutter when the data leaves ticks to label, and none when it does not', () => {
    const withValues = render(<LineChart values={[10, 20, 30]} yAxis="left" />);
    expect(screen.getByTestId('chart-axis-left')).toBeDefined();
    withValues.unmount();

    render(<LineChart values={[]} yAxis="left" />);
    expect(screen.queryByTestId('chart-axis-left')).toBeNull();
  });

  it('drops the gutter when no y axis is asked for', () => {
    render(<LineChart values={[10, 20, 30]} />);

    expect(screen.queryByTestId('chart-axis-left')).toBeNull();
  });

  it('thins the x labels as the plot narrows', () => {
    const labels = Array.from({ length: 12 }, (_, index) => `JUL ${2025 + Math.floor(index / 6)}`);
    const values = labels.map((_, index) => index);
    const countLabels = (root: HTMLElement) =>
      root.querySelectorAll('[data-testid="line-chart-x-labels"] span').length;

    restoreViewport = stubViewportWidth(768);
    const wide = render(<LineChart values={values} labels={labels} />);
    const wideCount = countLabels(wide.container);
    wide.unmount();
    restoreViewport();
    restoreViewport = undefined;

    restoreViewport = stubViewportWidth(390);
    const phone = render(<LineChart values={values} labels={labels} />);
    const phoneCount = countLabels(phone.container);
    phone.unmount();
    restoreViewport();
    restoreViewport = undefined;

    restoreViewport = stubViewportWidth(100);
    const narrow = render(<LineChart values={values} labels={labels} />);
    const narrowCount = countLabels(narrow.container);

    expect(phoneCount).toBeLessThanOrEqual(wideCount);
    expect(phoneCount).toBeGreaterThanOrEqual(2);
    expect(narrowCount).toBe(2);
  });

  it('reserves the gutter width beside the x labels so they start where the plot does', () => {
    const { container } = render(
      <LineChart values={[1, 2, 3]} labels={['JAN', 'FEB', 'MAR']} yAxis="left" />,
    );
    const row = container.querySelector('[data-testid="line-chart-x-labels"]')?.parentElement;
    const spacer = row?.firstElementChild;

    expect(screen.getByTestId('chart-axis-left').classList.contains(AXIS_GUTTER_CLASS)).toBe(true);
    expect(spacer?.classList.contains(AXIS_GUTTER_CLASS)).toBe(true);
    expect(spacer).not.toBe(screen.getByTestId('chart-axis-left'));
  });
});
