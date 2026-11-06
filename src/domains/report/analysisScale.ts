/** The selectable history span. */
export const ANALYSIS_RANGES = ['1y', '3y', '5y', 'all'] as const;
export type AnalysisRange = (typeof ANALYSIS_RANGES)[number];

/** The drawable scale: monthly points, or the annual rollup of the same data. */
export const ANALYSIS_GRANULARITIES = ['monthly', 'annual'] as const;
export type AnalysisGranularity = (typeof ANALYSIS_GRANULARITIES)[number];

/** `YYYY-MM` becomes `YYYY`; an already yearly key is unchanged. */
export const yearOf = (yearMonth: string): string => yearMonth.slice(0, 4);

/** A comparable month ordinal from its parts, so "the month before" is a subtraction. */
export const monthCodeOf = (year: number, month: number): number => year * 12 + (month - 1);

/** `YYYY-MM` becomes a comparable month ordinal. */
export const monthCode = (yearMonth: string): number => {
  const [year, month] = yearMonth.split('-').map(Number);
  return monthCodeOf(year, month);
};

/** Sort comparator: oldest first. */
export const byMonth = (a: string, b: string): number => monthCode(a) - monthCode(b);
