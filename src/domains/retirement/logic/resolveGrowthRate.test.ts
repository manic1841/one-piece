import { describe, expect, it } from 'vitest';

import { resolveGrowthRate } from './resolveGrowthRate';

describe('resolveGrowthRate', () => {
  it('returns plan inflation when growthRate is undefined', () => {
    expect(resolveGrowthRate(undefined, 2)).toBe(2);
  });

  it('returns explicit 0 when growthRate is 0 (no growth)', () => {
    expect(resolveGrowthRate(0, 2)).toBe(0);
  });

  it('returns the specified rate when growthRate is positive', () => {
    expect(resolveGrowthRate(3.5, 2)).toBe(3.5);
  });
});
