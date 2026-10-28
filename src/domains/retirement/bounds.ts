/**
 * Single source for retirement assumption bounds, shared by the schema and UI.
 *
 * `birthYear.max` is the one bound the schema cannot know statically: it is the
 * caller-injected current year. The exported constant keeps a documented
 * placeholder so neither consumer re-declares the other four ranges; call
 * `getRetirementAssumptionBounds(currentYear)` to resolve the placeholder.
 */
export interface RetirementAssumptionBounds {
  birthYear: { min: number; max: number };
  retirementAge: { min: number; max: number };
  lifeExpectancy: { min: number; max: number };
  inflationRate: { min: number; max: number };
  annualReturnRate: { min: number; max: number };
}

export const RETIREMENT_ASSUMPTION_BOUNDS: RetirementAssumptionBounds = {
  birthYear: { min: 1900, max: Number.POSITIVE_INFINITY },
  retirementAge: { min: 1, max: 120 },
  lifeExpectancy: { min: 1, max: Number.POSITIVE_INFINITY },
  inflationRate: { min: -0.1, max: 0.2 },
  annualReturnRate: { min: -0.5, max: 0.3 },
};

export function getRetirementAssumptionBounds(currentYear: number): RetirementAssumptionBounds {
  return {
    ...RETIREMENT_ASSUMPTION_BOUNDS,
    birthYear: {
      min: RETIREMENT_ASSUMPTION_BOUNDS.birthYear.min,
      max: currentYear,
    },
  };
}

/**
 * Absolute range for a projection year: phases and the start year share it, and
 * the UI lists it in a picker. The engine has no clock, so this is not narrowed
 * by the current year — an imported plan may legitimately start in the past.
 */
export const RETIREMENT_YEAR_BOUNDS = { min: 1900, max: 2200 } as const;

/**
 * Top of the numbers offered for an age (life expectancy). The schema keeps
 * `lifeExpectancy.max` open; a picker needs something finite to list.
 */
export const RETIREMENT_AGE_LIST_MAX = 130;

/** Growth rate shared by rules and phases; the UI slider spans the same range. */
export const RETIREMENT_GROWTH_RATE_BOUNDS = { min: -0.1, max: 0.2 } as const;
