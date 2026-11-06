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

  it('carries the unclosed caption only on the first and last blocks', () => {
    expect(ANALYSIS_SECTIONS.filter((section) => section.showUnclosedLabels).map((s) => s.id)).toEqual(
      ['net-worth', 'cash-coverage'],
    );
  });
});
