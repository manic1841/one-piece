import { savingsRateOf } from '@/domains/report/analysisRatios';
import { monthCode } from '@/domains/report/analysisScale';
import { type FinancialReport, ReportType } from '@/domains/report/schemas';

export interface FinancialAnalysisKpis {
  yearMonth: string | null;
  assets: number | null;
  netWorth: number | null;
  liabilities: number | null;
  /** Null without a same-month income statement, or when income is not positive. */
  savingsRate: number | null;
  anchorClosed: boolean | null;
}

export type BalanceSheetReport = Extract<
  FinancialReport,
  { type: typeof ReportType.BALANCE_SHEET }
>;
export type IncomeReport = Extract<FinancialReport, { type: typeof ReportType.INCOME_STATEMENT }>;

export const EMPTY_KPIS: FinancialAnalysisKpis = {
  yearMonth: null,
  assets: null,
  netWorth: null,
  liabilities: null,
  savingsRate: null,
  anchorClosed: null,
};

export const isBalanceSheet = (report: FinancialReport): report is BalanceSheetReport =>
  report.type === ReportType.BALANCE_SHEET;

export const isIncome = (report: FinancialReport): report is IncomeReport =>
  report.type === ReportType.INCOME_STATEMENT;

/** ADR-0090: the latest balance sheet anchors every analysis, closed or not. */
export const resolveAnchorReport = (
  balanceSheets: readonly BalanceSheetReport[],
): BalanceSheetReport | null =>
  balanceSheets.reduce<BalanceSheetReport | null>(
    (latest, report) =>
      latest === null || monthCode(report.yearMonth) > monthCode(latest.yearMonth)
        ? report
        : latest,
    null,
  );

/** The anchor month's headline figures; the savings rate needs that month's income statement. */
export const kpisOf = (
  anchorReport: BalanceSheetReport,
  anchorIncome: IncomeReport | undefined,
  closedMonths: ReadonlySet<string>,
): FinancialAnalysisKpis => ({
  yearMonth: anchorReport.yearMonth,
  assets: anchorReport.data.assets.total,
  netWorth: anchorReport.data.assets.total - anchorReport.data.liabilities.total,
  liabilities: anchorReport.data.liabilities.total,
  savingsRate: anchorIncome
    ? savingsRateOf(anchorIncome.data.incomeTotal, anchorIncome.data.expenseTotal)
    : null,
  anchorClosed: closedMonths.has(anchorReport.yearMonth),
});
