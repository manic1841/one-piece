import { describe, expect, it } from 'vitest';

import { changeRateOf, debtRatioOf, returnRateOf, savingsRateOf } from './analysisRatios';

describe('analysisRatios', () => {
  it('computes the savings rate and keeps a negative one', () => {
    expect(savingsRateOf(5000, 4000)).toBe(20);
    expect(savingsRateOf(4000, 5000)).toBe(-25);
  });

  it('leaves the savings rate null without positive income', () => {
    expect(savingsRateOf(0, 200)).toBeNull();
    expect(savingsRateOf(0, 0)).toBeNull();
  });

  it('computes the return rate on a positive opening value', () => {
    expect(returnRateOf(100, 1000)).toBe(10);
    expect(returnRateOf(-50, 1200)).toBeCloseTo(-4.1667, 4);
  });

  it('leaves the return rate null when nothing was held', () => {
    expect(returnRateOf(0, 0)).toBeNull();
    expect(returnRateOf(100, -1000)).toBeNull();
  });

  it('computes the debt ratio on positive total assets', () => {
    expect(debtRatioOf(100, 1000)).toBe(10);
    expect(debtRatioOf(1400, 1000)).toBe(140);
  });

  it('leaves the debt ratio null when total assets are not positive', () => {
    expect(debtRatioOf(100, 0)).toBeNull();
  });

  it('measures change in percent of the previous magnitude', () => {
    expect(changeRateOf(100, 150)).toBe(50);
    // The sign survives a negative base: −100 → −50 is a gain, not a fall.
    expect(changeRateOf(-100, -50)).toBe(50);
    expect(changeRateOf(100, 50)).toBe(-50);
  });

  it('leaves the change null without both sides or with a zero base', () => {
    expect(changeRateOf(null, 100)).toBeNull();
    expect(changeRateOf(100, null)).toBeNull();
    expect(changeRateOf(0, 100)).toBeNull();
  });
});
