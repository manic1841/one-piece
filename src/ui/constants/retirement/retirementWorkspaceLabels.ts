/** 退休計畫工作區的顯示文字單一來源。 */

export const RetirementWorkspaceTabLabels = {
  overview: 'Overview',
  projection: 'Projection',
  planSetup: 'Plan Setup',
} as const;

export type RetirementWorkspaceTabKey = keyof typeof RetirementWorkspaceTabLabels;

export const RETIREMENT_WORKSPACE_TAB_ORDER: RetirementWorkspaceTabKey[] = [
  'overview',
  'projection',
  'planSetup',
];

export const RetirementWorkspaceSectionLabels = {
  outcome: 'OUTCOME',
  currentFinancialState: 'CURRENT FINANCIAL STATE',
  netWorth: 'NET WORTH',
  risks: 'KEY RISKS',
  cashFlow: 'CASH FLOW PROJECTION',
  assumptions: 'SCENARIO ASSUMPTIONS',
  income: 'INCOME',
  expenses: 'LIVING EXPENSES',
  events: 'LIFE EVENTS',
} as const;

export type RetirementWorkspaceSectionKey = keyof typeof RetirementWorkspaceSectionLabels;

export const RetirementWorkspaceTermLabels = {
  incomeStream: 'Income Stream',
  incomeStreams: 'Income Streams',
  expenseCategory: 'Expense Category',
  expenseCategories: 'Expense Categories',
  retirementEvent: 'Life Event',
  retirementEvents: 'Life Events',
} as const;

export const RetirementWorkspaceLabels = {
  tabsAriaLabel: '退休計畫檢視',
  loading: '載入中',
  loadError: '無法載入退休計畫。',
  notFoundTitle: 'NOT FOUND',
  notFound: '找不到此退休計畫。',
  retryAction: '重試',
  projectionEmptyTitle: 'NO PROJECTION',
  projectionEmptyDescription: '完成每月關帳後，點擊「重新計算」以建立投影。',
  goToClose: '前往每月關帳',
  recalculateAction: 'Recalculate',
  autoUpdateOn: 'Auto-Update: ON',
  autoUpdateOff: 'Auto-Update: OFF',
  deletePlanAction: 'Delete plan',
  staleBannerPrefix: '收入樣本年度可更新：',
  staleBannerMiddle: ' 筆收入資料仍使用舊年度，建議更新至 ',
  staleBannerSuffix: ' 年。',
  staleApplyAction: '更新',
  staleDismissAction: '稍後',
} as const;

export const RetirementWorkspaceMetricLabels = {
  outcomeRetirementSavings: '退休時資產',
  outcomeMinYear: '最低資產年份',
  outcomeBankrupt: '是否破產',
  stateAssets: '資產',
  stateLiabilities: '負債',
  stateStartingNetWorth: '期初淨資產',
  stateAsOfPrefix: '截至',
  stateEmptyTitle: 'NO SNAPSHOT',
  stateEmptyDescription: '尚無已關帳期間的財務快照，投影無法建立。請先完成每月關帳。',
} as const;

export const RetirementRiskLabels = {
  retirementYear: '退休年',
  bankruptcyYear: '破產年',
  minSavingsYear: '最低資產年',
  lifeExpectancyEnd: '預期壽命終點',
  none: '無',
} as const;

export const RetirementAssumptionsLabels = {
  viewTitle: 'Basic Assumptions',
  editTitle: 'Edit Assumptions',
  editAction: 'Edit',
  saveAction: 'Save',
  cancelAction: 'Cancel',
  currentYear: 'Current Year',
  birthYear: 'Birth Year',
  retirementAge: 'Retirement Age',
  lifeExpectancy: 'Life Expectancy',
  inflationRate: 'Inflation Rate',
  inflationRateInput: 'Inflation Rate (%)',
  investmentReturn: 'Investment Return',
  investmentReturnInput: 'Investment Return Rate (%)',
} as const;

export const RetirementTabContentLabels = {
  importFromLedger: 'Import from Ledger',
  importDebtRepayments: '匯入債務還款',
  lifelong: '終身',
  editAction: 'Edit',
  deleteAction: 'Delete',
  incomeEmpty:
    'No income streams added yet. Import from the ledger or click Add Income to get started.',
  expenseEmpty: 'No expense categories defined yet. Click Add Expense to get started.',
  eventEmpty: 'No life events defined yet. Click Add Event to get started.',
  phaseCount: (count: number) => `${count} phases`,
} as const;

export const RetirementYearlyDetailLabels = {
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

export const RetirementChartLabels = {
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

export const RetirementExpenseBadgeLabels = {
  typeGeneral: '一般支出',
  typeDebtPayment: '債務還款',
  interestOnly: '只繳利息',
  includesPrincipal: '含本金',
} as const;
