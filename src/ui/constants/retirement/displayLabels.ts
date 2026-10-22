export const PROJECTION_COMMON_LABELS = {
  DASH: '—',
  CHECK: '✓',
  YES: 'Yes',
  NO: 'No',
  RETIRED: '退休',
  WORKING: '工作中',
  RATE_PREFIX: '利率',
  RATIO_PREFIX: '比例',
  CURRENCY_PREFIX: 'NT$',
  LOADING: '載入中…',
} as const;

export const PROJECTION_RISK_LABELS = {
  retirementYear: '退休年',
  bankruptcyYear: '破產年',
  minSavingsYear: '最低資產年',
  lifeExpectancyEnd: '預期壽命終點',
  none: '無',
} as const;

export const PROJECTION_YEARLY_DETAIL_LABELS = {
  sectionTitle: '每年明細',
  retirementDivider: '退休',
  incomeBreakdown: '收入明細',
  expenseBreakdown: '支出明細',
  noIncomeItems: '無收入項目',
  noExpenseItems: '無支出項目',
  columns: {
    year: '年度',
    status: '狀態',
    income: '收入',
    expense: '支出',
    investmentReturn: '投資收益',
    netCashFlow: '淨資產變動',
    /** Yearly rows are stated at the start of the year, matching the retirement hero. */
    openingNetWorth: '淨資產（年初）',
  },
} as const;

export const PROJECTION_CHART_LABELS = {
  retirementMarker: 'Retirement',
  negativeMarker: 'Negative',
  selectedMarker: 'Selected',
  tooltipYearPrefix: 'Year',
  netWorth: 'Net Worth',
  income: 'Income',
  investmentReturn: 'Investment Return',
  expense: 'Expense',
  netCashFlow: 'Net Worth Change',
  cashFlowAriaLabel: 'Net worth change projection by year',
  netWorthAriaLabel: 'Net worth projection by year',
} as const;
