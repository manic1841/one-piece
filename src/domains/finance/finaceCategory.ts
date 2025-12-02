// Income Statement Category
export const IncomeStatementCategory = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;

export type IncomeStatementCategory =
  (typeof IncomeStatementCategory)[keyof typeof IncomeStatementCategory];

// Balance Sheet Category
export const BalanceSheetCategory = {
  ASSET: 'asset',
  LIABILITY: 'liability',
  EQUITY: 'equity',
} as const;

export type BalanceSheetCategory = (typeof BalanceSheetCategory)[keyof typeof BalanceSheetCategory];

// Cash Flow Category
export const CashFlowCategory = {
  OPERATING: 'operating',
  INVESTING: 'investing',
  FINANCING: 'financing',
  RECONCILIATION: 'reconciliation',
} as const;

export type CashFlowCategory = (typeof CashFlowCategory)[keyof typeof CashFlowCategory];
