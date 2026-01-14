import {
  AssetSubCategory,
  BalanceSheetCategory,
  CashFlowCategory,
  EquitySubCategory,
  ExpenseSubCategory,
  FinancingSubCategory,
  IncomeStatementCategory,
  IncomeSubCategory,
  InvestingSubCategory,
  LiabilitySubCategory,
  OperatingSubCategory,
} from '@/domains/finance/types/categories';

// Income Statement Category
export const IncomeStatementCategoryLabel = {
  [IncomeStatementCategory.INCOME]: '收入',
  [IncomeStatementCategory.EXPENSE]: '支出',
};

export const IncomeStatementCategoryOptions = Object.entries(IncomeStatementCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

// Income SubCategory
export const IncomeSubCategoryLabel = {
  [IncomeSubCategory.SALARY]: '薪資',
  [IncomeSubCategory.BONUS]: '獎金',
  [IncomeSubCategory.OTHER_INCOME]: '其他收入',
};

export const IncomeSubCategoryOptions = Object.entries(IncomeSubCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

// Expense SubCategory
export const ExpenseSubCategoryLabel = {
  [ExpenseSubCategory.LIVING]: '生活費',
  [ExpenseSubCategory.HOUSING]: '住房',
  [ExpenseSubCategory.TRANSPORTATION]: '交通',
  [ExpenseSubCategory.INTEREST]: '利息',
  [ExpenseSubCategory.TAX]: '稅金',
  [ExpenseSubCategory.OTHER_EXPENSE]: '其他支出',
};

export const ExpenseSubCategoryOptions = Object.entries(ExpenseSubCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

// Cash Flow Category
export const CashFlowCategoryLabel = {
  [CashFlowCategory.OPERATING]: '營運',
  [CashFlowCategory.INVESTING]: '投資',
  [CashFlowCategory.FINANCING]: '融資',
  [CashFlowCategory.RECONCILIATION]: '調節',
};

export const CashFlowCategoryOptions = Object.entries(CashFlowCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

// Operating SubCategory
export const OperatingSubCategoryLabel = {
  [OperatingSubCategory.REGULAR_OPERATIONS]: '日常營運',
  [OperatingSubCategory.OTHER_OPERATING]: '其他營運',
};

export const OperatingSubCategoryOptions = Object.entries(OperatingSubCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

// Investing SubCategory
export const InvestingSubCategoryLabel = {
  [InvestingSubCategory.PURCHASE_ASSETS]: '購置資產',
  [InvestingSubCategory.STOCK_INVESTMENTS]: '股票投資',
  [InvestingSubCategory.OTHER_INVESTING]: '其他投資',
};

export const InvestingSubCategoryOptions = Object.entries(InvestingSubCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

// Financing SubCategory
export const FinancingSubCategoryLabel = {
  [FinancingSubCategory.SHORT_TERM_LOANS]: '短期貸款',
  [FinancingSubCategory.LONG_TERM_LOANS]: '長期貸款',
  [FinancingSubCategory.OWNER_DRAWS]: '業主提款',
  [FinancingSubCategory.OTHER_FINANCING]: '其他融資',
};

export const FinancingSubCategoryOptions = Object.entries(FinancingSubCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

// Balance Sheet Category
export const BalanceSheetCategoryLabel = {
  [BalanceSheetCategory.ASSET]: '資產',
  [BalanceSheetCategory.LIABILITY]: '負債',
  [BalanceSheetCategory.EQUITY]: '權益',
};

export const BalanceSheetCategoryOptions = Object.entries(BalanceSheetCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

// Asset SubCategory
export const AssetSubCategoryLabel = {
  [AssetSubCategory.CASH]: '現金',
  [AssetSubCategory.INVESTMENTS]: '投資',
  [AssetSubCategory.REAL_ESTATE]: '不動產',
  [AssetSubCategory.OTHER_ASSETS]: '其他資產',
};

export const AssetSubCategoryOptions = Object.entries(AssetSubCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

// Liability SubCategory
export const LiabilitySubCategoryLabel = {
  [LiabilitySubCategory.SHORT_TERM_DEBT]: '短期負債',
  [LiabilitySubCategory.LONG_TERM_DEBT]: '長期負債',
  [LiabilitySubCategory.OTHER_LIABILITIES]: '其他負債',
};

export const LiabilitySubCategoryOptions = Object.entries(LiabilitySubCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

// Equity SubCategory
export const EquitySubCategoryLabel = {
  [EquitySubCategory.RETAINED_EARNINGS]: '保留盈餘',
  [EquitySubCategory.OWNER_INVESTMENTS]: '業主投資',
  [EquitySubCategory.STOCK_PROFIT]: '股票利潤',
  [EquitySubCategory.OTHER_EQUITY]: '其他權益',
};

export const EquitySubCategoryOptions = Object.entries(EquitySubCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);
