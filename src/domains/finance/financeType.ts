// Report Type
export const ReportType = {
  INCOME_STATEMENT: 'income_statement',
  BALANCE_SHEET: 'balance_sheet',
  CASH_FLOW: 'cash_flow',
} as const;

export type ReportType = (typeof ReportType)[keyof typeof ReportType];

// Balance Sheet Source Type
export const BalanceSheetSourceType = {
  ACCOUNT: 'account',
  PROJECT: 'project',
  MANUAL: 'manual',
} as const;

export type BalanceSheetSourceType =
  (typeof BalanceSheetSourceType)[keyof typeof BalanceSheetSourceType];

// Income Statement Source Type
export const IncomeStatementSourceType = {
  TRANSACTION: 'transaction',
  PROJECT: 'project',
  MANUAL: 'manual',
  PLANNED_INCOME: 'plannedIncome',
} as const;

export type IncomeStatementSourceType =
  (typeof IncomeStatementSourceType)[keyof typeof IncomeStatementSourceType];

// Cash Flow Source Type
export const CashFlowSourceType = {
  ACCOUNT: 'account',
  PROJECT: 'project',
  MANUAL: 'manual',
} as const;

export type CashFlowSourceType = (typeof CashFlowSourceType)[keyof typeof CashFlowSourceType];
