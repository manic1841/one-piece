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
} from '@/domains/report/categories';

const toOptions = <T extends Record<string, string>>(labels: T) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const IncomeStatementCategoryLabel = {
  [IncomeStatementCategory.INCOME]: '收入',
  [IncomeStatementCategory.EXPENSE]: '支出',
};
export const IncomeStatementCategoryOptions = toOptions(IncomeStatementCategoryLabel);

export const IncomeSubCategoryLabel = {
  [IncomeSubCategory.SALARY]: '薪資',
  [IncomeSubCategory.BONUS]: '獎金',
  [IncomeSubCategory.OTHER_INCOME]: '其他收入',
};
export const IncomeSubCategoryOptions = toOptions(IncomeSubCategoryLabel);

export const ExpenseSubCategoryLabel = {
  [ExpenseSubCategory.LIVING]: '生活費',
  [ExpenseSubCategory.HOUSING]: '住房',
  [ExpenseSubCategory.TRANSPORTATION]: '交通',
  [ExpenseSubCategory.INTEREST]: '利息',
  [ExpenseSubCategory.TAX]: '稅務',
  [ExpenseSubCategory.OTHER_EXPENSE]: '其他支出',
};
export const ExpenseSubCategoryOptions = toOptions(ExpenseSubCategoryLabel);

export const CashFlowCategoryLabel = {
  [CashFlowCategory.OPERATING]: '營業活動',
  [CashFlowCategory.INVESTING]: '投資活動',
  [CashFlowCategory.FINANCING]: '籌資活動',
  [CashFlowCategory.RECONCILIATION]: '調節',
};
export const CashFlowCategoryOptions = toOptions(CashFlowCategoryLabel);

export const OperatingSubCategoryLabel = {
  [OperatingSubCategory.REGULAR_OPERATIONS]: '經常營業',
  [OperatingSubCategory.OTHER_OPERATING]: '其他營業',
};
export const OperatingSubCategoryOptions = toOptions(OperatingSubCategoryLabel);

export const InvestingSubCategoryLabel = {
  [InvestingSubCategory.PURCHASE_ASSETS]: '購置資產',
  [InvestingSubCategory.STOCK_INVESTMENTS]: '股票投資',
  [InvestingSubCategory.OTHER_INVESTING]: '其他投資',
};
export const InvestingSubCategoryOptions = toOptions(InvestingSubCategoryLabel);

export const FinancingSubCategoryLabel = {
  [FinancingSubCategory.SHORT_TERM_LOANS]: '短期貸款',
  [FinancingSubCategory.LONG_TERM_LOANS]: '長期貸款',
  [FinancingSubCategory.OWNER_DRAWS]: '業主提款',
  [FinancingSubCategory.OWNER_DEPOSIT]: '業主存款',
  [FinancingSubCategory.OTHER_FINANCING]: '其他籌資',
};
export const FinancingSubCategoryOptions = toOptions(FinancingSubCategoryLabel);

export const BalanceSheetCategoryLabel = {
  [BalanceSheetCategory.ASSET]: '資產',
  [BalanceSheetCategory.LIABILITY]: '負債',
  [BalanceSheetCategory.EQUITY]: '權益',
};
export const BalanceSheetCategoryOptions = toOptions(BalanceSheetCategoryLabel);

export const AssetSubCategoryLabel = {
  [AssetSubCategory.CASH]: '現金',
  [AssetSubCategory.INVESTMENTS]: '投資',
  [AssetSubCategory.REAL_ESTATE]: '房地產',
  [AssetSubCategory.OTHER_ASSETS]: '其他資產',
};
export const AssetSubCategoryOptions = toOptions(AssetSubCategoryLabel);

export const LiabilitySubCategoryLabel = {
  [LiabilitySubCategory.SHORT_TERM_DEBT]: '短期負債',
  [LiabilitySubCategory.LONG_TERM_DEBT]: '長期負債',
  [LiabilitySubCategory.OTHER_LIABILITIES]: '其他負債',
};
export const LiabilitySubCategoryOptions = toOptions(LiabilitySubCategoryLabel);

export const EquitySubCategoryLabel = {
  [EquitySubCategory.RETAINED_EARNINGS]: '保留盈餘',
  [EquitySubCategory.OWNER_INVESTMENTS]: '業主投資',
  [EquitySubCategory.STOCK_PROFIT]: '股票利潤',
  [EquitySubCategory.OTHER_EQUITY]: '其他權益',
  [EquitySubCategory.RECONCILIATION]: '平帳調整',
};
export const EquitySubCategoryOptions = toOptions(EquitySubCategoryLabel);

export const ReportCommonLabel = {
  SUBJECT: '科目',
  AMOUNT: '金額',
  TOTAL: '總計',
  SUBTOTAL: '小計',
  DETAILS: '明細',
  NO_DATA: '暫無資料',
  NO_ACTIVITY: '無顯著活動',
  DATE_RANGE: '期間',
  GENERATED_AT: '產生時間',
  ADJUSTMENTS: '系統調整',
};

export const CashFlowReportLabel = {
  TITLE: '現金流量表',
  ITEM: '活動項目',
  INFLOW: '現金流入',
  OUTFLOW: '現金流出',
  NET_CHANGE: '現金淨變動',
  BEGINNING_BALANCE: '期初餘額 (估算)',
  ENDING_BALANCE: '期末餘額 (估算)',
  OPERATING: '營業活動',
  INVESTING: '投資活動',
  FINANCING: '籌資活動',
};

export const BalanceSheetReportLabel = {
  TITLE: '資產負債表',
  ASSETS: '資產',
  LIABILITIES: '負債',
  NET_WORTH: '淨資產',
  NET_WORTH_NOTE: '* 淨資產 = 資產總計 - 負債總計',
  CURRENT_ASSETS: '流動資產',
  INVESTMENT_ASSETS: '投資資產',
  FIXED_ASSETS: '固定資產',
  SHORT_TERM_LIABILITIES: '短期負債',
  LONG_TERM_LIABILITIES: '長期負債',
  CASH_RECONCILIATION: '平帳調整',
};

export const IncomeStatementReportLabel = {
  TITLE: '損益表',
  INCOME_TOTAL: '收入總計',
  EXPENSE_TOTAL: '支出總計',
  NET_INCOME: '淨利',
  NET_INCOME_SUMMARY: '本期淨利',
};
