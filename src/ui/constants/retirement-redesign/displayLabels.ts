export const PROJECTION_RISK_LABELS = {
  retirementYear: '退休年',
  bankruptcyYear: '破產年',
  minSavingsYear: '最低資產年',
  lifeExpectancyEnd: '預期壽命終點',
  none: '無',
} as const;

export const PROJECTION_YEARLY_DETAIL_LABELS = {
  sectionTitle: '每年明細',
  retiredLegend: '退休後',
  workingLegend: '退休前',
  incomeBreakdown: '收入明細',
  expenseBreakdown: '支出明細',
  noIncomeItems: '無收入項目',
  noExpenseItems: '無支出項目',
  columns: {
    year: 'Year',
    age: 'Age',
    status: 'Status',
    income: 'Income',
    expense: 'Expense',
    investmentReturn: '投資收益',
    netCashFlow: 'Net',
    netWorth: 'Net Worth',
  },
} as const;

export const PROJECTION_CHART_LABELS = {
  retirementMarker: 'Retirement',
  tooltipYearPrefix: 'Year',
  netWorth: 'Net Worth',
  income: 'Income',
  investmentReturn: 'Investment Return',
  expense: 'Expense',
  netCashFlow: 'Net Cash Flow',
  cashFlowAriaLabel: 'Cash flow projection by year',
  netWorthAriaLabel: 'Net worth projection by year',
} as const;
