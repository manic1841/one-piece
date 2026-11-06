import { type FinancialReport, ReportType } from '@/domains/report/schemas';

import { type FinancialAnalysisKpis } from './getFinancialAnalysisWorkflow';

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

export const toMonthCode = (yearMonth: string): number => {
  const [year, month] = yearMonth.split('-').map(Number);
  return year * 12 + (month - 1);
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
      latest === null || toMonthCode(report.yearMonth) > toMonthCode(latest.yearMonth)
        ? report
        : latest,
    null,
  );

/** Null when there is no positive income to divide by. */
export const savingsRateOf = (income: number, expense: number): number | null =>
  income > 0 ? ((income - expense) / income) * 100 : null;

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
