/**
 * Domain bounds re-exported for Surface. Components may not import `@/domains`
 * directly (ADR-0062), and Display Labels is the tier allowed to read domain
 * values, so the ranges every year and rate field needs are surfaced here.
 */
export {
  RETIREMENT_AGE_LIST_MAX,
  RETIREMENT_GROWTH_RATE_BOUNDS,
  RETIREMENT_YEAR_BOUNDS,
  type RetirementAssumptionBounds,
} from '@/domains/retirement/bounds';
