import { describe, expect, it } from 'vitest';

import { LINE_CHART_HEIGHT, LINE_CHART_WIDTH, buildLineGeometry } from './lineChartGeometry';

describe('buildLineGeometry', () => {
  it('returns empty geometry for no values', () => {
    const geometry = buildLineGeometry([]);

    expect(geometry.points).toEqual([]);
    expect(geometry.path).toBe('');
    expect(geometry.areaPath).toBe('');
    expect(geometry.gridLines).toEqual([]);
    expect(geometry.xLabels).toEqual([]);
  });

  it('spreads points edge to edge and keeps them inside the plot height', () => {
    const geometry = buildLineGeometry([10, 20, 30]);

    expect(geometry.points).toHaveLength(3);
    expect(geometry.points[0].xRatio).toBe(0);
    expect(geometry.points[2].xRatio).toBe(1);
    expect(geometry.points[2].x).toBe(LINE_CHART_WIDTH);
    geometry.points.forEach((point) => {
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(LINE_CHART_HEIGHT);
      expect(point.yRatio).toBeGreaterThanOrEqual(0);
      expect(point.yRatio).toBeLessThanOrEqual(1);
    });
  });

  it('puts a higher value higher on the plot', () => {
    const geometry = buildLineGeometry([10, 20, 30]);

    expect(geometry.points[2].y).toBeLessThan(geometry.points[0].y);
    expect(geometry.points[0].value).toBe(10);
  });

  it('reports a top-anchored ratio that matches the SVG y, so overlays land on the line', () => {
    const geometry = buildLineGeometry([10, 20, 30]);

    geometry.points.forEach((point) => {
      expect(point.topRatio).toBeCloseTo(point.y / LINE_CHART_HEIGHT, 4);
    });
    // The highest value sits near the top (small topRatio), not the bottom.
    expect(geometry.points[2].yRatio).toBeGreaterThan(0.9);
    expect(geometry.points[2].topRatio).toBeLessThan(0.2);
    expect(geometry.points[0].topRatio).toBeGreaterThan(geometry.points[2].topRatio);
  });

  it('closes the area path down to the baseline', () => {
    const geometry = buildLineGeometry([10, 30, 20]);

    expect(geometry.path.startsWith('M')).toBe(true);
    expect(geometry.areaPath.endsWith(`L${geometry.points[0].x} ${LINE_CHART_HEIGHT} Z`)).toBe(
      true,
    );
  });

  it('handles a flat series without dividing by zero', () => {
    const geometry = buildLineGeometry([5, 5, 5]);

    geometry.points.forEach((point) => {
      expect(Number.isFinite(point.y)).toBe(true);
      expect(point.yRatio).toBeGreaterThanOrEqual(0);
      expect(point.yRatio).toBeLessThanOrEqual(1);
    });
  });

  it('never draws more x labels than the cap and always keeps the last', () => {
    const values = Array.from({ length: 24 }, (_, index) => index);
    const labels = values.map((value) => `M${value}`);
    const geometry = buildLineGeometry(values, labels, 4, 7);

    expect(geometry.xLabels.length).toBeLessThanOrEqual(7);
    expect(geometry.xLabels[geometry.xLabels.length - 1].text).toBe('M23');
  });

  it('omits x labels when their length does not match the values', () => {
    const geometry = buildLineGeometry([1, 2, 3], ['JAN', 'FEB']);

    expect(geometry.xLabels).toEqual([]);
  });
});
