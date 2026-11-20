import { describe, expect, it } from 'vitest';

import { ANALYSIS_SECTIONS, groupSections } from './analysisChartSpecs';

describe('analysis section registry', () => {
  it('orders the index exactly like the rendered blocks', () => {
    expect(ANALYSIS_SECTIONS.map((section) => section.id)).toEqual([
      'net-worth',
      'asset-composition',
      'investment-performance',
      'income',
      'cash-flow',
      'debt-leverage',
      'cash-coverage',
    ]);
  });

  it('groups only the paired blocks and leaves full blocks alone', () => {
    expect(groupSections(ANALYSIS_SECTIONS).map((row) => row.map((section) => section.id))).toEqual(
      [
        ['net-worth'],
        ['asset-composition', 'investment-performance'],
        ['income', 'cash-flow'],
        ['debt-leverage'],
        ['cash-coverage'],
      ],
    );
  });

  it('carries one renderer per entry', () => {
    expect(ANALYSIS_SECTIONS.every((section) => typeof section.chart === 'function')).toBe(true);
  });

  it('puts the unclosed caption on the first block only', () => {
    // The page derives the caption from position, so order alone decides it.
    expect(ANALYSIS_SECTIONS[0]?.id).toBe('net-worth');
  });
});
