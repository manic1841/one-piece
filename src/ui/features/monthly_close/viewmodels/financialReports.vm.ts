import type {
  BalanceSheetDrift,
  CashFlowDrift,
  IncomeStatementDrift,
} from '@/domains/report/reportDrift';

export type { BalanceSheetDrift, CashFlowDrift, IncomeStatementDrift };

/** Report timestamps the FINANCIAL_REPORTS stage renders; blank when not persisted. */
export interface ReportTimestampsVM {
  incomeStatement?: string;
  balanceSheet?: string;
  cashFlow?: string;
}

/** The three statements as the FINANCIAL_REPORTS stage displays them (drift-annotated). */
export interface ReportViewsVM {
  incomeStatement: IncomeStatementDrift | null;
  balanceSheet: BalanceSheetDrift | null;
  cashFlow: CashFlowDrift | null;
}
