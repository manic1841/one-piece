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
});
