export const IncomeStatementCategory = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type IncomeStatementCategory =
  (typeof IncomeStatementCategory)[keyof typeof IncomeStatementCategory];

export const IncomeSubCategory = {
  SALARY: 'SALARY',
  BONUS: 'BONUS',
  OTHER_INCOME: 'OTHER_INCOME',
} as const;

export type IncomeSubCategory = (typeof IncomeSubCategory)[keyof typeof IncomeSubCategory];

export const ExpenseSubCategory = {
  LIVING: 'LIVING',
  HOUSING: 'HOUSING',
  TRANSPORTATION: 'TRANSPORTATION',
  INTEREST: 'INTEREST',
  TAX: 'TAX',
  OTHER_EXPENSE: 'OTHER_EXPENSE',
} as const;

export type ExpenseSubCategory = (typeof ExpenseSubCategory)[keyof typeof ExpenseSubCategory];

export const CashFlowCategory = {
  OPERATING: 'OPERATING',
  INVESTING: 'INVESTING',
  FINANCING: 'FINANCING',
  RECONCILIATION: 'RECONCILIATION',
} as const;

export type CashFlowCategory = (typeof CashFlowCategory)[keyof typeof CashFlowCategory];

export const OperatingSubCategory = {
  REGULAR_OPERATIONS: 'REGULAR_OPERATIONS',
  OTHER_OPERATING: 'OTHER_OPERATING',
} as const;

export type OperatingSubCategory = (typeof OperatingSubCategory)[keyof typeof OperatingSubCategory];

export const InvestingSubCategory = {
  PURCHASE_ASSETS: 'PURCHASE_ASSETS',
  STOCK_INVESTMENTS: 'STOCK_INVESTMENTS',
  OTHER_INVESTING: 'OTHER_INVESTING',
} as const;

export type InvestingSubCategory = (typeof InvestingSubCategory)[keyof typeof InvestingSubCategory];

export const FinancingSubCategory = {
  SHORT_TERM_LOANS: 'SHORT_TERM_LOANS',
  LONG_TERM_LOANS: 'LONG_TERM_LOANS',
  OWNER_DRAWS: 'OWNER_DRAWS',
  OWNER_DEPOSIT: 'OWNER_DEPOSIT',
  OTHER_FINANCING: 'OTHER_FINANCING',
} as const;

export type FinancingSubCategory = (typeof FinancingSubCategory)[keyof typeof FinancingSubCategory];

export const BalanceSheetCategory = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
} as const;

export type BalanceSheetCategory = (typeof BalanceSheetCategory)[keyof typeof BalanceSheetCategory];

export const AssetSubCategory = {
  CASH: 'CASH',
  INVESTMENTS: 'INVESTMENTS',
  REAL_ESTATE: 'REAL_ESTATE',
  OTHER_ASSETS: 'OTHER_ASSETS',
} as const;

export type AssetSubCategory = (typeof AssetSubCategory)[keyof typeof AssetSubCategory];

export const LiabilitySubCategory = {
  SHORT_TERM_DEBT: 'SHORT_TERM_DEBT',
  LONG_TERM_DEBT: 'LONG_TERM_DEBT',
  OTHER_LIABILITIES: 'OTHER_LIABILITIES',
} as const;

export type LiabilitySubCategory = (typeof LiabilitySubCategory)[keyof typeof LiabilitySubCategory];

export const EquitySubCategory = {
  RETAINED_EARNINGS: 'RETAINED_EARNINGS',
  OWNER_INVESTMENTS: 'OWNER_INVESTMENTS',
  STOCK_PROFIT: 'STOCK_PROFIT',
  OTHER_EQUITY: 'OTHER_EQUITY',
  RECONCILIATION: 'RECONCILIATION',
} as const;

export type EquitySubCategory = (typeof EquitySubCategory)[keyof typeof EquitySubCategory];
