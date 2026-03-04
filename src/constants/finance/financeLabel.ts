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
import { ProjectExpenseBehavior, ProjectIncomeBehavior } from '@/domains/project/types/categories';

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
  [FinancingSubCategory.OWNER_DEPOSIT]: '業主存款',
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
  [EquitySubCategory.OTHER_EQUITY]: '權益項目',
  [EquitySubCategory.RECONCILIATION]: '平帳調整',
};

export const EquitySubCategoryOptions = Object.entries(EquitySubCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

// Project Flow Behavior - IncomeAs
export const ProjectIncomeAsLabel = {
  [ProjectIncomeBehavior.INCREASE_INCOME]: '增加收入 (預設)',
  [ProjectIncomeBehavior.DECREASE_INCOME]: '減少收入',
  [ProjectIncomeBehavior.INCREASE_ASSET]: '增加資產 (資金流出)',
  [ProjectIncomeBehavior.DECREASE_LIABILITY]: '減少負債 (資金流出)',
  [ProjectIncomeBehavior.OWNER_DRAW]: '業主提取 (資金流出)',
};

export const ProjectIncomeAsOptions = Object.entries(ProjectIncomeAsLabel).map(([key, value]) => ({
  value: key,
  label: value,
}));

// Project Flow Behavior - ExpenseAs
export const ProjectExpenseAsLabel = {
  [ProjectExpenseBehavior.INCREASE_EXPENSE]: '增加支出 (預設)',
  [ProjectExpenseBehavior.DECREASE_EXPENSE]: '減少支出',
  [ProjectExpenseBehavior.DECREASE_ASSET]: '減少資產 (資金流入)',
  [ProjectExpenseBehavior.INCREASE_LIABILITY]: '增加負債 (資金流入)',
  [ProjectExpenseBehavior.OWNER_DEPOSIT]: '業主注入 (資金流入)',
};

export const ProjectExpenseAsOptions = Object.entries(ProjectExpenseAsLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

// --- Report UI Common Labels ---
export const ReportCommonLabel = {
  SUBJECT: '科目',
  AMOUNT: '金額',
  TOTAL: '總計',
  SUBTOTAL: '小計',
  DETAILS: '明細',
  NO_DATA: '無資料',
  NO_ACTIVITY: '無顯著活動',
  DATE_RANGE: '期間',
  GENERATED_AT: '生成時間',
  ADJUSTMENTS: '系統自動調整',
};

// --- Report Specific Labels ---
export const CashFlowReportLabel = {
  TITLE: '現金流量表',
  ITEM: '活動項目',
  INFLOW: '【現金流入】',
  OUTFLOW: '【現金流出】',
  NET_CHANGE: '【現金淨增減】',
  BEGINNING_BALANCE: '期初現金 (估計)',
  ENDING_BALANCE: '期末現金 (估計)',
  OPERATING: '營業活動',
  INVESTING: '投資活動',
  FINANCING: '融資活動',
};

export const BalanceSheetReportLabel = {
  TITLE: '資產負債表',
  ASSETS: '資產',
  LIABILITIES: '負債',
  NET_WORTH: '【淨資產】',
  NET_WORTH_NOTE: '* 淨資產 = 資產總額 - 負債總額',
  CURRENT_ASSETS: '流動資產',
  INVESTMENT_ASSETS: '投資資產',
  FIXED_ASSETS: '固定資產',
  SHORT_TERM_LIABILITIES: '短期負債',
  LONG_TERM_LIABILITIES: '長期負債',
  CASH_RECONCILIATION: '現金平帳',
};

export const IncomeStatementReportLabel = {
  TITLE: '損益表',
  INCOME_TOTAL: '收入總計',
  EXPENSE_TOTAL: '支出總計',
  NET_INCOME: '本期損益',
  NET_INCOME_SUMMARY: '【本期損益】',
};
