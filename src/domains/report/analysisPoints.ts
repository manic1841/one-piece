/**
 * The analysis page's point groups, in display order. Every consumer that needs
 * "all points" (range years, period keys, unclosed months) derives it from here,
 * so adding a block is one entry.
 */
export const ANALYSIS_POINT_KEYS = [
  'netWorth',
  'assetComposition',
  'investmentPerformance',
  'income',
  'cashFlow',
  'debtLeverage',
  'cashCoverage',
] as const;

export type AnalysisPointKey = (typeof ANALYSIS_POINT_KEYS)[number];

/** What every group shares; the callers here only need the period and its state. */
interface PeriodPoint {
  yearMonth: string;
  unclosed?: boolean;
}

/** Every group's points, concatenated in display order. */
export const allPointsOf = (
  groups: Readonly<Record<AnalysisPointKey, readonly PeriodPoint[]>>,
): PeriodPoint[] => ANALYSIS_POINT_KEYS.flatMap((key) => [...groups[key]]);
