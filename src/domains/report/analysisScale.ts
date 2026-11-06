/** The selectable history span. */
export const ANALYSIS_RANGES = ['1y', '3y', '5y', 'all'] as const;
export type AnalysisRange = (typeof ANALYSIS_RANGES)[number];

/** The drawable scale: monthly points, or the annual rollup of the same data. */
export const ANALYSIS_GRANULARITIES = ['monthly', 'annual'] as const;
export type AnalysisGranularity = (typeof ANALYSIS_GRANULARITIES)[number];

/** `YYYY-MM` becomes `YYYY`; an already yearly key is unchanged. */
export const yearOf = (yearMonth: string): string => yearMonth.slice(0, 4);
