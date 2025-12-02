import { IncomeStatementCategory } from '@/domains/finance/finaceCategory';
import { CashFlowCategory } from '@/domains/finance/finaceCategory';
import { BalanceSheetCategory } from '@/domains/finance/finaceCategory';

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
