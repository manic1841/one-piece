import { describe, expect, it } from 'vitest';

import {
  LINE_CHART_HEIGHT,
  LINE_CHART_WIDTH,
  buildLineGeometry,
  formatAxisValue,
} from './lineChartGeometry';

describe('buildLineGeometry', () => {
  it('returns empty geometry for no values', () => {
    const geometry = buildLineGeometry([]);

    expect(geometry.points).toEqual([]);
    expect(geometry.path).toBe('');
    expect(geometry.areaPath).toBe('');
    expect(geometry.gridLines).toEqual([]);
    expect(geometry.xLabels).toEqual([]);
    expect(geometry.yLabels).toEqual([]);
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

  it('runs the gridlines top to bottom, like ComposedChart', () => {
    const geometry = buildLineGeometry([10, 20, 30]);

    // Index 0 is the topmost line; each later gridline sits lower.
    for (let index = 1; index < geometry.gridLines.length; index += 1) {
      expect(geometry.gridLines[index]).toBeGreaterThan(geometry.gridLines[index - 1]);
    }
  });

  it('drops y labels from the largest value down, matching the line', () => {
    const geometry = buildLineGeometry([10, 20, 30]);

    // Labels and gridlines share one order: ascending y, descending text.
    expect(geometry.yLabels).toHaveLength(geometry.gridLines.length);
    geometry.yLabels.forEach((label, index) => {
      expect(label.y).toBe(geometry.gridLines[index]);
      if (index > 0) {
        expect(Number.parseFloat(label.text)).toBeLessThanOrEqual(
          Number.parseFloat(geometry.yLabels[index - 1].text),
        );
      }
    });
    expect(geometry.yLabels[0].y).toBeLessThan(geometry.yLabels[geometry.yLabels.length - 1].y);
  });

  it('tops the scale above the maximum and bottoms it below the minimum', () => {
    const geometry = buildLineGeometry([10, 30]);
    const top = Number.parseFloat(geometry.yLabels[0].text);
    const bottom = Number.parseFloat(geometry.yLabels[geometry.yLabels.length - 1].text);

    // Padding keeps the line clear of the frame, so the ends sit outside the data.
    expect(top).toBeGreaterThan(geometry.points[1].value);
    expect(bottom).toBeLessThan(geometry.points[0].value);
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
    const geometry = buildLineGeometry(values, labels, { maxXLabels: 7 });

    expect(geometry.xLabels.length).toBeLessThanOrEqual(7);
    expect(geometry.xLabels[geometry.xLabels.length - 1].text).toBe('M23');
  });

  it('keeps at least two x labels, however narrow the budget', () => {
    const values = Array.from({ length: 12 }, (_, index) => index);
    const labels = values.map((value) => `M${value}`);
    const geometry = buildLineGeometry(values, labels, { maxXLabels: 1 });

    expect(geometry.xLabels).toHaveLength(2);
    expect(geometry.xLabels[0].text).toBe('M0');
    expect(geometry.xLabels[1].text).toBe('M11');
  });

  it('drops the repeated year from neighbouring x labels', () => {
    const values = Array.from({ length: 12 }, (_, index) => index);
    const labels = values.map((value) => `JUL ${2025 + Math.floor(value / 6)}`);
    const geometry = buildLineGeometry(values, labels, { maxXLabels: 3 });

    expect(geometry.xLabels.map((label) => label.text)).toEqual(['JUL 2025', 'JUL 2026', 'JUL']);
  });

  it('omits x labels when their length does not match the values', () => {
    const geometry = buildLineGeometry([1, 2, 3], ['JAN', 'FEB']);

    expect(geometry.xLabels).toEqual([]);
  });

  it('uses the gridline count from the options, never fewer than two lines', () => {
    expect(buildLineGeometry([1, 2], [], { yTicks: 3 }).gridLines).toHaveLength(3);
    expect(buildLineGeometry([1, 2], [], { yTicks: 1 }).gridLines).toHaveLength(2);
  });

  describe('zero line', () => {
    it('reports where zero sits when it falls inside the range', () => {
      const geometry = buildLineGeometry([-10, 10], [], { includeZero: true });

      expect(geometry.zeroLineY).toBeDefined();
      expect(geometry.zeroLineY).toBeGreaterThan(0);
      expect(geometry.zeroLineY).toBeLessThan(LINE_CHART_HEIGHT);
      // Zero is the midpoint of the symmetric range, so it lands on the middle of the plot.
      expect(geometry.zeroLineY).toBeCloseTo(LINE_CHART_HEIGHT / 2, 0);
    });

    it('leaves zero unmarked when the range excludes it', () => {
      expect(buildLineGeometry([10, 20, 30]).zeroLineY).toBeUndefined();
    });

    it('labels the zero baseline once, dropping the ticks it would collide with', () => {
      const geometry = buildLineGeometry([-10, 10], [], { includeZero: true, yTicks: 4 });
      const zeros = geometry.yLabels.filter((label) => label.text === '0');

      expect(zeros).toHaveLength(1);
      expect(zeros[0].y).toBeCloseTo(geometry.zeroLineY as number, 1);
      geometry.yLabels
        .filter((label) => label.text !== '0')
        .forEach((label) => {
          expect(Math.abs(label.y - (geometry.zeroLineY as number)) >= 20).toBe(true);
        });
    });

    it('does not add a zero label when the range excludes zero', () => {
      const geometry = buildLineGeometry([10, 20, 30], [], { yTicks: 4 });

      expect(geometry.yLabels.map((label) => label.text)).not.toContain('0');
    });

    it('drops repeated interior ticks instead of printing the same value twice', () => {
      // A flat series rounds every tick onto the same few labels.
      const geometry = buildLineGeometry([5, 5, 5], [], { yTicks: 5 });
      const texts = geometry.yLabels.map((label) => label.text);

      expect(new Set(texts).size).toBeLessThan(texts.length);
      // Interior duplicates never survive; the last label is kept even when it
      // repeats the one above it, because an axis needs both ends.
      texts.slice(0, -1).forEach((text, index) => {
        if (index > 0) expect(text).not.toBe(texts[index - 1]);
      });
      expect(texts.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('formatAxisValue', () => {
  it('stays within the 6 characters the axis gutter allows', () => {
    const samples = [
      0, 1, 42, -42, 999, 1_000, -1_500, 999_499, 999_500, 999_949, 999_950, 999_999, 1_000_000,
      -1_234_567, 12_345_678, -12_345_678, 99_999_999, -99_999_999, 100_000_000, -123_456_789,
      999_950_000, -999_950_000, 999_999_999, -999_999_999, 1_000_000_000, -1_500_000_000,
      9_999_999_999, -9_999_999_999,
    ];

    samples.forEach((value) => {
      expect(formatAxisValue(value).length).toBeLessThanOrEqual(6);
    });
  });

  it('keeps one decimal in the millions so neighbours stay distinguishable', () => {
    expect(formatAxisValue(1_234_567)).toBe('1.2M');
    expect(formatAxisValue(1_500_000)).toBe('1.5M');
    expect(formatAxisValue(2_750_000)).toBe('2.8M');
  });

  it('promotes before a bucket would reach 1000', () => {
    expect(formatAxisValue(999_600)).toBe('1000K');
    expect(formatAxisValue(999_950_000)).toBe('1000M');
    expect(formatAxisValue(1_000_000_000)).toBe('1.0B');
  });
});
