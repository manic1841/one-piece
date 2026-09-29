import { describe, expect, it } from 'vitest';

import { DRIFT_STATUS } from '@/domains/report/reportDrift';

import { combineDrift } from './reportDrift.vm';

const amount = (
  value: number,
  previousAmount: number | null = null,
  status: (typeof DRIFT_STATUS)[keyof typeof DRIFT_STATUS] = DRIFT_STATUS.UNCHANGED,
) => ({ amount: value, previousAmount, status });

describe('combineDrift', () => {
  it('sums unchanged operands with no drift', () => {
    expect(combineDrift([amount(10), amount(5)])).toEqual({
      amount: 15,
      previousAmount: null,
      status: DRIFT_STATUS.UNCHANGED,
    });
  });

  it('flags the sum when any operand drifted', () => {
    const combined = combineDrift([amount(12, 10, DRIFT_STATUS.CHANGED), amount(5)]);

    expect(combined).toEqual({ amount: 17, previousAmount: 15, status: DRIFT_STATUS.CHANGED });
  });

  it('does not mask a drifted operand even when the totals happen to match', () => {
    // 10 -> 12 and 5 -> 3 sum to the same preview/persisted total.
    const combined = combineDrift([
      amount(12, 10, DRIFT_STATUS.CHANGED),
      amount(3, 5, DRIFT_STATUS.CHANGED),
    ]);

    expect(combined.status).toBe(DRIFT_STATUS.CHANGED);
    expect(combined.previousAmount).toBe(15);
  });

  // #237: an ADDED operand has no persisted value behind it, so the combined
  // previous total must count it as 0. Counting it as its own amount made a
  // merged parent claim a persisted total it never had — and T10's drift
  // predicate reads exactly this number.
  it('counts an added operand as zero in the persisted total', () => {
    const combined = combineDrift([amount(100, null, DRIFT_STATUS.ADDED), amount(50)]);

    expect(combined).toEqual({ amount: 150, previousAmount: 50, status: DRIFT_STATUS.CHANGED });
  });

  it('keeps a removed operand persisted amount in the total', () => {
    const combined = combineDrift([amount(0, 70, DRIFT_STATUS.REMOVED), amount(50)]);

    expect(combined).toEqual({ amount: 50, previousAmount: 120, status: DRIFT_STATUS.CHANGED });
  });

  it('treats a restructured operand persisted total as its previous value', () => {
    const combined = combineDrift([
      amount(30, 30, DRIFT_STATUS.RESTRUCTURED),
      amount(20, 40, DRIFT_STATUS.CHANGED),
    ]);

    expect(combined).toEqual({ amount: 50, previousAmount: 70, status: DRIFT_STATUS.CHANGED });
  });
});
