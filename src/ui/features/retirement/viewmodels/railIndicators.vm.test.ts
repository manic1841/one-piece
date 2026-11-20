import { describe, expect, it } from 'vitest';

import {
  EMPTY_INDICATORS,
  assumptionsFilled,
  clampRetirementAge,
  currentAgeFor,
  failedIndicators,
  mapIndicators,
  retirementAgeRange,
  retirementYearFor,
} from './railIndicators.vm';

describe('retirementAgeRange', () => {
  it('starts below the current age and ends at the projection end', () => {
    expect(retirementAgeRange(40, 85)).toEqual({ min: 40, max: 85 });
  });

  it('keeps 55 as the floor before mid-life', () => {
    expect(retirementAgeRange(30, 85)).toEqual({ min: 30, max: 85 });
  });

  it('clamps the ceiling at 90', () => {
    expect(retirementAgeRange(30, 100)).toEqual({ min: 30, max: 90 });
  });

  it('never inverts when life expectancy is earlier than the current age', () => {
    expect(retirementAgeRange(70, 60)).toEqual({ min: 55, max: 70 });
  });

  it('clamps an age into the range', () => {
    expect(clampRetirementAge(50, 40, 85)).toBe(50);
    expect(clampRetirementAge(30, 40, 85)).toBe(40);
    expect(clampRetirementAge(99, 40, 85)).toBe(85);
  });
});

describe('retirementYearFor', () => {
  it('adds the age to the birth year', () => {
    expect(retirementYearFor('1990', '60')).toBe(2050);
  });

  it('returns null when either field is blank or unparsable', () => {
    expect(retirementYearFor('', '60')).toBeNull();
    expect(retirementYearFor('1990', '')).toBeNull();
    expect(retirementYearFor('abc', '60')).toBeNull();
  });
});

describe('currentAgeFor', () => {
  it('derives the age from the current year', () => {
    expect(currentAgeFor('1990', 2026)).toBe(36);
  });

  it('falls back to zero for a blank birth year', () => {
    expect(currentAgeFor('', 2026)).toBe(0);
  });
});

describe('indicator mapping', () => {
  const summary = {
    retirementNetWorth: 1000,
    finalNetWorth: 2000,
    minNetWorth: 500,
    minNetWorthYear: 2030,
    bankruptcyYear: null,
    isBankrupt: false,
  };

  it('formats the three values', () => {
    const values = mapIndicators(summary, 'fresh');
    expect(values.retirementNetWorthText).toBe('NT$1,000');
    expect(values.minNetWorthText).toBe('NT$500');
    expect(values.finalNetWorthText).toBe('NT$2,000');
    expect(values.minNetWorthYear).toBe(2030);
  });

  it('keeps the retirement value null when the summary has none', () => {
    expect(
      mapIndicators({ ...summary, retirementNetWorth: null }, 'fresh').retirementNetWorthText,
    ).toBeNull();
  });

  it('dashes every value and keeps the reason on failure', () => {
    const values = failedIndicators('broken');
    expect(values).toEqual({
      ...EMPTY_INDICATORS,
      status: 'error',
      reason: 'broken',
    });
  });
});

describe('assumptionsFilled', () => {
  it('requires every field', () => {
    expect(assumptionsFilled({ birthYear: '1990', retirementAge: '60' })).toBe(true);
    expect(assumptionsFilled({ birthYear: '1990', retirementAge: '' })).toBe(false);
  });
});
