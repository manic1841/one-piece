// ------------- Income Statement -------------

// Income Statement Income SubCategories
export const IncomeSubCategory = {
  SALARY: 'salary',
  BONUS: 'bonus',
  OTHER_INCOME: 'other_income',
} as const;

export type IncomeSubCategory = (typeof IncomeSubCategory)[keyof typeof IncomeSubCategory];

// Income Statement Expense SubCategories
export const ExpenseSubCategory = {
  LIVING: 'living',
  HOUSING: 'housing',
  TRANSPORTATION: 'transportation',
  INTEREST: 'interest',
  TAX: 'tax',
  OTHER_EXPENSE: 'other_expense',
} as const;

export type ExpenseSubCategory = (typeof ExpenseSubCategory)[keyof typeof ExpenseSubCategory];

// Income Statement Category
export const IncomeStatementCategory = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;

export type IncomeStatementCategory =
  (typeof IncomeStatementCategory)[keyof typeof IncomeStatementCategory];

export const mapIncomeStatementSubcategory = {
  [IncomeStatementCategory.INCOME]: IncomeSubCategory,
  [IncomeStatementCategory.EXPENSE]: ExpenseSubCategory,
};
// ------------- Balance Sheet -------------

// Asset SubCategories
export const AssetSubCategory = {
  CASH: 'cash',
  INVESTMENTS: 'investments',
  REAL_ESTATE: 'real_estate',
  OTHER_ASSETS: 'other_assets',
} as const;

export type AssetSubCategory = (typeof AssetSubCategory)[keyof typeof AssetSubCategory];

// Liability SubCategories
export const LiabilitySubCategory = {
  SHORT_TERM_DEBT: 'short_term_debt',
  LONG_TERM_DEBT: 'long_term_debt',
  OTHER_LIABILITIES: 'other_liabilities',
} as const;
export type LiabilitySubCategory = (typeof LiabilitySubCategory)[keyof typeof LiabilitySubCategory];

// Equity SubCategories
export const EquitySubCategory = {
  RETAINED_EARNINGS: 'retained_earnings',
  OWNER_INVESTMENTS: 'owner_investments',
  STOCK_PROFIT: 'stock_profit',
  OTHER_EQUITY: 'other_equity',
  RECONCILIATION: 'reconciliation',
} as const;

export type EquitySubCategory = (typeof EquitySubCategory)[keyof typeof EquitySubCategory];

// Balance Sheet Category
export const BalanceSheetCategory = {
  ASSET: 'asset',
  LIABILITY: 'liability',
  EQUITY: 'equity',
} as const;

export type BalanceSheetCategory = (typeof BalanceSheetCategory)[keyof typeof BalanceSheetCategory];

export const mapBalanceSheetSubcategory = {
  [BalanceSheetCategory.ASSET]: AssetSubCategory,
  [BalanceSheetCategory.LIABILITY]: LiabilitySubCategory,
  [BalanceSheetCategory.EQUITY]: EquitySubCategory,
};

// ------------- Cash Flow -------------

// Cash Flow Operating SubCategories
export const OperatingSubCategory = {
  REGULAR_OPERATIONS: 'regular_operations',
  OTHER_OPERATING: 'other_operating',
} as const;

export type OperatingSubCategory = (typeof OperatingSubCategory)[keyof typeof OperatingSubCategory];

// Investing SubCategories
export const InvestingSubCategory = {
  PURCHASE_ASSETS: 'purchase_assets',
  STOCK_INVESTMENTS: 'stock_investments',
  OTHER_INVESTING: 'other_investing',
} as const;

export type InvestingSubCategory = (typeof InvestingSubCategory)[keyof typeof InvestingSubCategory];

// Financing SubCategories
export const FinancingSubCategory = {
  SHORT_TERM_LOANS: 'short_term_loans',
  LONG_TERM_LOANS: 'long_term_loans',
  OWNER_DRAWS: 'owner_draws',
  OWNER_DEPOSIT: 'owner_deposit',
  OTHER_FINANCING: 'other_financing',
} as const;

export type FinancingSubCategory = (typeof FinancingSubCategory)[keyof typeof FinancingSubCategory];

// Cash Flow Category
export const CashFlowCategory = {
  OPERATING: 'operating',
  INVESTING: 'investing',
  FINANCING: 'financing',
  RECONCILIATION: 'reconciliation',
} as const;

export type CashFlowCategory = (typeof CashFlowCategory)[keyof typeof CashFlowCategory];

export const mapCashFlowSubcategory = {
  [CashFlowCategory.OPERATING]: OperatingSubCategory,
  [CashFlowCategory.INVESTING]: InvestingSubCategory,
  [CashFlowCategory.FINANCING]: FinancingSubCategory,
};
