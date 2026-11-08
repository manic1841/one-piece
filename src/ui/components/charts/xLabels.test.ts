import { describe, expect, it } from 'vitest';

import {
  MAX_X_LABELS,
  MIN_X_LABEL_SLOT,
  pickXLabels,
  shortenXLabels,
  xLabelBudget,
} from './xLabels';

describe('pickXLabels', () => {
  it('keeps every label when the series is shorter than the budget', () => {
    expect(pickXLabels(3, 6)).toEqual([0, 1, 2]);
  });

  it('always keeps the first and last point', () => {
    const indices = pickXLabels(30, 4);

    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(29);
  });

  it('spreads the labels evenly over the whole span', () => {
    expect(pickXLabels(10, 4)).toEqual([0, 3, 6, 9]);
  });

  it('keeps at least two labels even when the budget is one', () => {
    expect(pickXLabels(10, 1)).toHaveLength(2);
  });

  it('copes with degenerate series', () => {
    expect(pickXLabels(0)).toEqual([]);
    expect(pickXLabels(1)).toEqual([0]);
  });
});

describe('shortenXLabels', () => {
  it('drops a year that repeats the previous label', () => {
    const labels = ['JAN 2024', 'FEB 2024', 'MAR 2025'];

    expect(shortenXLabels(labels, [0, 1, 2]).map((label) => label.text)).toEqual([
      'JAN 2024',
      'FEB',
      'MAR 2025',
    ]);
  });

  it('leaves a non-month label untouched', () => {
    expect(shortenXLabels(['Q1', 'Q2'], [0, 1]).map((label) => label.text)).toEqual(['Q1', 'Q2']);
  });
});

describe('xLabelBudget', () => {
  it('keeps the full cap before the plot has been measured', () => {
    expect(xLabelBudget(null)).toBe(MAX_X_LABELS);
  });

  it('gives one slot per minimum label width', () => {
    expect(xLabelBudget(MIN_X_LABEL_SLOT * 3)).toBe(3);
  });

  it('never exceeds the cap on a wide plot', () => {
    expect(xLabelBudget(2000)).toBe(MAX_X_LABELS);
  });

  it('holds the two-label floor for anything narrower than two slots', () => {
    expect(xLabelBudget(100)).toBe(2);
    expect(xLabelBudget(0)).toBe(2);
  });

  it('lets a phone keep more than the floor', () => {
    // A 390px viewport leaves ~310px of plot once page, card and gutter padding
    // are subtracted; a 768px one leaves ~656px.
    expect(xLabelBudget(310)).toBe(4);
    expect(xLabelBudget(656)).toBe(MAX_X_LABELS);
    expect(xLabelBudget(310)).toBeGreaterThan(2);
  });
});
