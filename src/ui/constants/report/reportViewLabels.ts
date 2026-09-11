export type ReportViewId = 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'CASH_FLOW';

export const REPORT_VIEW_TITLES: Record<ReportViewId, string> = {
  INCOME_STATEMENT: '損益表',
  BALANCE_SHEET: '資產負債表',
  CASH_FLOW: '現金流量表',
};
