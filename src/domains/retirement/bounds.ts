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
  lifeExpectancy: { min: 1, max: 130 },
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
