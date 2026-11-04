import { describe, expect, it } from 'vitest';

import { type ProjectionSummary } from '@/domains/retirement/projectionTypes';
import { mapRetirementComparison } from '@/ui/features/retirement/viewmodels/retirementComparison.vm';

const summary = (finalNetWorth: number, retirementNetWorth: number): ProjectionSummary => ({
  retirementNetWorth,
  finalNetWorth,
  minNetWorth: finalNetWorth,
  minNetWorthYear: 2026,
  bankruptcyYear: null,
  isBankrupt: false,
});

describe('mapRetirementComparison deltas', () => {
  it('omits both deltas when the trial reproduces the baseline exactly', () => {
    const row = mapRetirementComparison(
      { age: 60, outcome: { ok: true, summary: summary(200, 100) } },
      summary(200, 100),
    );

    // The contract is that a difference only appears when the ages differ.
    expect(row.finalDelta).toBeNull();
    expect(row.retirementDelta).toBeNull();
  });

  it('signs a positive difference and keeps a negative one', () => {
    const better = mapRetirementComparison(
      { age: 60, outcome: { ok: true, summary: summary(300, 100) } },
      summary(200, 100),
    );
    const worse = mapRetirementComparison(
      { age: 60, outcome: { ok: true, summary: summary(50, 100) } },
      summary(200, 100),
    );

    expect(better.finalDelta).toBe('+NT$100');
    expect(worse.finalDelta).toContain('NT$');
    expect(worse.finalDelta?.startsWith('+')).toBe(false);
  });
});
