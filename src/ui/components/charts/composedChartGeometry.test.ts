import { describe, expect, it } from 'vitest';

import {
  COMPOSED_CHART_HEIGHT,
  type ComposedSeries,
  buildComposedGeometry,
  pickComposedXLabels,
} from './composedChartGeometry';

/** y of the area path's closing baseline edge (the last coordinate pair before `Z`). */
const baselineYOf = (areaPath: string): number => {
  const coords = areaPath.replace(/ Z$/, '').split(/[ML]/).slice(1);
  return Number(coords[coords.length - 1].trim().split(' ')[1]);
};

/** y of the line's top edge (the first coordinate pair). */
const lineYOf = (path: string): number => Number(path.split(' ')[1]);

describe('buildComposedGeometry', () => {
  it('grows positive bars up from the zero baseline and negative bars down', () => {
    const layout = buildComposedGeometry(
      ['A', 'B'],
      [
        { kind: 'bar', tone: 'positive', values: [10, 20] },
        { kind: 'bar', tone: 'negative', values: [-5, 10] },
      ],
    );

    expect(layout.zeroY).toBeDefined();
    const zeroY = layout.zeroY as number;
    // Series 0 column 0 (value 10) sits above the baseline.
    expect(layout.bars[0].y).toBeLessThan(zeroY);
    // Series 1 column 0 (value -5) is the third bar (series-major order):
    // it hangs below the baseline from the zero line downwards.
    const negativeBar = layout.bars[2];
    expect(negativeBar.columnIndex).toBe(0);
    expect(negativeBar.y).toBeCloseTo(zeroY);
    expect(negativeBar.y + negativeBar.height).toBeGreaterThan(zeroY);
  });

  it('scales a right-axis series on its own scale', () => {
    const layout = buildComposedGeometry(
      ['A', 'B'],
      [
        { kind: 'bar', tone: 'positive', values: [10, 20] },
        { kind: 'line', tone: 'primary', values: [1000, 2000], axis: 'right' },
      ],
    );

    expect(layout.leftLabels.length).toBeGreaterThan(0);
    expect(layout.rightLabels.length).toBeGreaterThan(0);
    // The two axes carry different tick text (10s vs 1000s).
    expect(layout.leftLabels.map((label) => label.text)).not.toEqual(
      layout.rightLabels.map((label) => label.text),
    );
    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0].points).toHaveLength(2);
  });

  it('builds an area path only when the line requests one', () => {
    const [plain] = buildComposedGeometry(
      ['A', 'B'],
      [{ kind: 'line', tone: 'primary', values: [1, 2] }],
    ).lines;
    const [filled] = buildComposedGeometry(
      ['A', 'B'],
      [{ kind: 'line', tone: 'primary', values: [1, 2], area: true }],
    ).lines;

    expect(plain.areaPath).toBeUndefined();
    expect(filled.areaPath).toBeDefined();
  });

  it('fills an area down to the supplied baseline instead of the zero line', () => {
    const series: ComposedSeries[] = [
      { kind: 'line', tone: 'positive', area: true, values: [100, 100] },
      {
        kind: 'line',
        tone: 'investment',
        area: true,
        values: [140, 140],
        baselineValues: [100, 100],
      },
    ];
    const layout = buildComposedGeometry(['A', 'B'], series);
    const [income, stacked] = layout.lines;

    // The stacked band starts where the income line sits...
    expect(baselineYOf(stacked.areaPath!)).toBeCloseTo(lineYOf(income.path));
    // ...which is higher on screen than the income band's own axis baseline.
    expect(baselineYOf(stacked.areaPath!)).toBeLessThan(baselineYOf(income.areaPath!));
    // The stacked line sits above its baseline, so its gradient keeps the default direction.
    expect(stacked.areaFlipped).toBe(false);
  });

  it('flips the area gradient when the baseline sits above the line on screen', () => {
    const [expense] = buildComposedGeometry(
      ['A', 'B'],
      [{ kind: 'line', tone: 'negative', area: true, values: [-10, -20] }],
    ).lines;

    expect(expense.areaFlipped).toBe(true);
  });

  it('places dynamic reference markers on their column and drops out-of-range ones', () => {
    const layout = buildComposedGeometry(
      ['A', 'B', 'C'],
      [{ kind: 'bar', tone: 'positive', values: [1, 2, 3] }],
      [{ index: 1, label: 'Retirement' }, { index: 9 }],
    );

    expect(layout.referenceLines).toHaveLength(1);
    expect(layout.referenceLines[0]).toMatchObject({ index: 1, label: 'Retirement' });
    expect(layout.referenceLines[0].xRatio).toBeCloseTo(layout.columns[1].xRatio);
  });

  it('anchors a column tooltip at its highest element', () => {
    const layout = buildComposedGeometry(
      ['A', 'B'],
      [{ kind: 'bar', tone: 'positive', values: [50, 5] }],
    );

    // The taller column (A) anchors higher in the plot than the shorter one (B).
    expect(layout.columns[0].topRatio).toBeLessThan(layout.columns[1].topRatio);
    expect(layout.columns[0].topRatio).toBeGreaterThanOrEqual(0);
    expect(layout.columns[0].topRatio).toBeLessThanOrEqual(1);
  });

  it('returns an empty layout for no labels', () => {
    const layout = buildComposedGeometry([], [{ kind: 'bar', tone: 'positive', values: [] }]);

    expect(layout.columns).toEqual([]);
    expect(layout.bars).toEqual([]);
    expect(layout.gridLines).toEqual([]);
  });

  it('never places a bar outside the plot height', () => {
    const layout = buildComposedGeometry(
      ['A'],
      [{ kind: 'bar', tone: 'positive', values: [1_000_000] }],
    );

    const bar = layout.bars[0];
    expect(bar.y).toBeGreaterThanOrEqual(0);
    expect(bar.y + bar.height).toBeLessThanOrEqual(COMPOSED_CHART_HEIGHT);
  });
});

describe('pickComposedXLabels', () => {
  it('always includes the last column', () => {
    const indices = pickComposedXLabels(30);

    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(29);
  });

  it('returns an empty list for no columns', () => {
    expect(pickComposedXLabels(0)).toEqual([]);
  });
});
