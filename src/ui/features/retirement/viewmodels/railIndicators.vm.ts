/**
 * Rail indicator state and retirement-age slider bounds.
 *
 * Indicators are a preview of the three summary numbers. They can be idle
 * (never calculated), fresh (just recalculated from the slider), stale (any
 * edit since), or error (the last refresh failed, values become dashes).
 */
import { type ProjectionSummary } from '@/domains/retirement/projectionTypes';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { formatCurrency } from '@/ui/utils';

export type IndicatorStatus = 'idle' | 'fresh' | 'stale' | 'error';

export interface RailIndicators {
  status: IndicatorStatus;
  retirementNetWorthText: string | null;
  minNetWorthText: string | null;
  minNetWorthYear: number | null;
  finalNetWorthText: string | null;
  reason: string | null;
}

export const EMPTY_INDICATORS: RailIndicators = {
  status: 'idle',
  retirementNetWorthText: null,
  minNetWorthText: null,
  minNetWorthYear: null,
  finalNetWorthText: null,
  reason: null,
};

export const mapIndicators = (
  summary: ProjectionSummary,
  status: IndicatorStatus,
  reason: string | null = null,
): RailIndicators => ({
  status,
  retirementNetWorthText:
    summary.retirementNetWorth === null ? null : formatCurrency(summary.retirementNetWorth),
  minNetWorthText: formatCurrency(summary.minNetWorth),
  minNetWorthYear: summary.minNetWorthYear,
  finalNetWorthText: formatCurrency(summary.finalNetWorth),
  reason,
});

export const failedIndicators = (reason: string): RailIndicators => ({
  ...EMPTY_INDICATORS,
  status: 'error',
  reason,
});

export const dashFor = (value: string | null): string => value ?? PROJECTION_COMMON_LABELS.DASH;

/** Slider keeps the age inside both the current age and the projection end. */
export const retirementAgeRange = (
  currentAge: number,
  lifeExpectancy: number,
): { min: number; max: number } => {
  const min = Math.min(currentAge, 55);
  const max = Math.max(currentAge, Math.min(90, lifeExpectancy));
  return { min, max };
};

export const clampRetirementAge = (
  age: number,
  currentAge: number,
  lifeExpectancy: number,
): number => {
  const { min, max } = retirementAgeRange(currentAge, lifeExpectancy);
  return Math.max(min, Math.min(max, age));
};

export const assumptionsFilled = (values: Record<string, string>): boolean =>
  Object.values(values).every((value) => value.trim() !== '');

/** Retirement year from the two assumptions that can still change while editing. */
export const retirementYearFor = (
  birthYearText: string,
  retirementAgeText: string,
): number | null => {
  if (birthYearText.trim() === '' || retirementAgeText.trim() === '') return null;
  const birthYear = Number(birthYearText);
  const age = Number(retirementAgeText);
  if (!Number.isFinite(birthYear) || !Number.isFinite(age)) return null;
  return birthYear + age;
};

/** Age at the start of the current year; negatives mean a future birth year. */
export const currentAgeFor = (birthYearText: string, currentYear: number): number => {
  if (birthYearText.trim() === '') return 0;
  const birthYear = Number(birthYearText);
  return Number.isFinite(birthYear) ? currentYear - birthYear : 0;
};

/** Last projected year (birth + life expectancy), or `null` while either is unset. */
export const finalYearFor = (birthYearText: string, lifeExpectancyText: string): number | null => {
  if (birthYearText.trim() === '' || lifeExpectancyText.trim() === '') return null;
  const birthYear = Number(birthYearText);
  const lifeExpectancy = Number(lifeExpectancyText);
  if (!Number.isFinite(birthYear) || !Number.isFinite(lifeExpectancy)) return null;
  if (birthYear <= 0 || lifeExpectancy <= 0) return null;
  return birthYear + lifeExpectancy;
};
