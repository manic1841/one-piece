import { type FinancialAnalysis } from '@/application/report/use_cases/getFinancialAnalysisWorkflow';
import {
  ANALYSIS_GRANULARITIES,
  ANALYSIS_RANGES,
  type AnalysisGranularity,
  type AnalysisRange,
  RANGE_MONTHS,
  byMonth,
  monthCode,
  yearOf,
} from '@/domains/report/analysisScale';

import { parseReportPeriod } from './reportHistory.vm';

export const DEFAULT_RANGE: AnalysisRange = '3y';

export const DEFAULT_GRANULARITY: AnalysisGranularity = 'monthly';

const YEAR_PATTERN = /^(\d{4})$/;

export interface AnalysisUrlState {
  range: AnalysisRange;
  granularity: AnalysisGranularity;
  /** `YYYY-MM` on the monthly scale, `YYYY` on the annual scale. */
  period: string | null;
}

const parseRange = (raw: string | null): AnalysisRange =>
  raw !== null && ANALYSIS_RANGES.includes(raw as AnalysisRange)
    ? (raw as AnalysisRange)
    : DEFAULT_RANGE;

const parseGranularity = (raw: string | null): AnalysisGranularity =>
  raw !== null && ANALYSIS_GRANULARITIES.includes(raw as AnalysisGranularity)
    ? (raw as AnalysisGranularity)
    : DEFAULT_GRANULARITY;

/**
 * Resolves the range, scale and selection from the URL. The period key's shape
 * wins over `?granularity=`: a bare year is annual, a month under `annual`
 * becomes its year.
 */
export const resolveAnalysisUrlState = (params: URLSearchParams): AnalysisUrlState => {
  const range = parseRange(params.get('range'));
  const granularity = parseGranularity(params.get('granularity'));
  const period = parseReportPeriod(params.get('period') ?? undefined);

  if (period?.mode === 'YEARLY') return { range, granularity: 'annual', period: period.raw };
  if (period?.mode === 'MONTHLY') {
    return {
      range,
      granularity,
      period: granularity === 'annual' ? String(period.year) : period.raw,
    };
  }

  return { range, granularity, period: null };
};

/** A bare `YYYY` key, which the annual scale carries. */
export const isYearKey = (key: string | null): key is string =>
  key !== null && YEAR_PATTERN.test(key);

/** `YYYY-MM` → `YYYY`. */
export const yearOfMonth = (yearMonth: string): string => yearOf(yearMonth);

/** Months from January of the year through the anchor, inclusive. */
export const monthsNeededForYear = (year: string, anchorYearMonth: string): number =>
  monthCode(anchorYearMonth) - monthCode(`${year}-01`) + 1;

/** The wider of two ranges, so an expansion never narrows what the user had. */
export const widerRange = (current: AnalysisRange, next: AnalysisRange): AnalysisRange =>
  ANALYSIS_RANGES.indexOf(next) > ANALYSIS_RANGES.indexOf(current) ? next : current;

/** Smallest available range that still reaches January of the year, or null. */
export const rangeForYear = (
  availableRanges: AnalysisRange[],
  neededMonths: number,
): AnalysisRange | null => {
  if (neededMonths <= 0) return null;
  for (const range of ANALYSIS_RANGES) {
    const covered = range === 'all' ? Infinity : RANGE_MONTHS[range];
    if (covered >= neededMonths && availableRanges.includes(range)) return range;
  }
  return null;
};

const monthsOf = (analysis: FinancialAnalysis): string[] => {
  const all = [
    ...analysis.netWorthPoints,
    ...analysis.assetCompositionPoints,
    ...analysis.investmentPerformancePoints,
    ...analysis.incomePoints,
    ...analysis.cashFlowPoints,
    ...analysis.debtLeveragePoints,
    ...analysis.cashCoveragePoints,
  ];
  return all.map((point) => point.yearMonth);
};

/** Every year with a drawable point anywhere on the page, newest first. */
export const drawableYears = (analysis: FinancialAnalysis): string[] =>
  [...new Set(monthsOf(analysis).map(yearOf))].sort().reverse();

/** The last month of the year that has a point, or null. */
export const latestMonthOfYear = (analysis: FinancialAnalysis, year: string): string | null =>
  monthsOf(analysis)
    .filter((month) => month.startsWith(`${year}-`))
    .sort((a, b) => byMonth(a, b))
    .at(-1) ?? null;
