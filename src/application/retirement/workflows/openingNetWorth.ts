import { calculateEquityTotal } from '@/domains/report/equityUtils';
import { ReportType } from '@/domains/report/schemas';
import { type BalanceSheetData, type FinancialReport } from '@/domains/report/types';

/** Newest month first: both the default and the picker want the latest one. */
export const newestMonthFirst = (a: string, b: string): number => (a < b ? 1 : a > b ? -1 : 0);

type BalanceSheetReport = FinancialReport & { data: BalanceSheetData };

const isBalanceSheet = (report: FinancialReport): report is BalanceSheetReport =>
  report.type === ReportType.BALANCE_SHEET;

/**
 * Balance sheets keyed by month. One report read serves both the default lookup
 * and the picker list, so "closed month ⇒ net worth" has a single home.
 */
export const balanceSheetsByMonth = (reports: FinancialReport[]): Map<string, BalanceSheetReport> =>
  new Map(reports.filter(isBalanceSheet).map((report) => [report.yearMonth, report]));

/** Net worth has one calculation path: assets − liabilities from the report. */
export const netWorthOf = (report: BalanceSheetReport): number => calculateEquityTotal(report.data);
