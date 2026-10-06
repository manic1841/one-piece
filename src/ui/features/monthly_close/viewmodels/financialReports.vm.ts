import type {
  BalanceSheetDrift,
  CashFlowDrift,
  IncomeStatementDrift,
} from '@/domains/report/reportDrift';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';

export type { BalanceSheetDrift, CashFlowDrift, IncomeStatementDrift };

/** Report timestamps the FINANCIAL_REPORTS stage renders; blank when not persisted. */
export interface ReportTimestampsVM {
  incomeStatement?: string;
  balanceSheet?: string;
  cashFlow?: string;
}

/**
 * The frozen generation times as ` ｜ 損益表 10:00 ｜ ...`, or an empty string when
 * nothing is persisted. Shared by the generated panel and the existing-reports
 * warning so both read the same evidence.
 */
export const formatReportTimestamps = (timestamps: ReportTimestampsVM): string => {
  const parts = [
    [REPORT_VIEW_TITLES.INCOME_STATEMENT, timestamps.incomeStatement],
    [REPORT_VIEW_TITLES.BALANCE_SHEET, timestamps.balanceSheet],
    [REPORT_VIEW_TITLES.CASH_FLOW, timestamps.cashFlow],
  ].flatMap(([title, time]) => (time ? [`${title} ${time}`] : []));
  return parts.length > 0 ? ` ｜ ${parts.join(' ｜ ')}` : '';
};

/** The three statements as the FINANCIAL_REPORTS stage displays them (drift-annotated). */
export interface ReportViewsVM {
  incomeStatement: IncomeStatementDrift | null;
  balanceSheet: BalanceSheetDrift | null;
  cashFlow: CashFlowDrift | null;
}
