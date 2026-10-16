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
  timelineGroup: '人生時程',
  financialGroup: '財務假設',
  currentAge: '目前年齡',
  retirementAge: '退休年齡',
  lifeExpectancy: '預期壽命',
  inflationRate: '通膨率',
  inflationRateInput: '通膨率 (%)',
  investmentReturn: '投資報酬率',
  investmentReturnInput: '投資報酬率 (%)',
  /** 推導年份以括註掛在年齡欄位旁（例：65（2045））。 */
  ageWithYear: (age: number, year: number) => `${age}（${year}）`,
  ratePercent: (rate: number) => `${rate}%`,
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

/** 結束條件語意（僅收入流與支出類別共用；Event phase 永遠是具體年份）。 */
export type RetirementEndCondition = 'retirement' | 'age' | 'year' | 'lifelong';

export const RetirementEndConditionLabels: Record<RetirementEndCondition, string> = {
  retirement: '退休時結束',
  age: '指定年齡',
  year: '指定年份',
  lifelong: '持續至預期壽命',
};

export const RetirementEndConditionOptions: Array<{
  value: RetirementEndCondition;
  label: string;
}> = (Object.keys(RetirementEndConditionLabels) as RetirementEndCondition[]).map((value) => ({
  value,
  label: RetirementEndConditionLabels[value],
}));

/** 成長率唯讀摘要的顯示文字（純函式）。 */
export const RetirementGrowthReadoutLabels = {
  usingPlanInflation: (rate: number) => `Using plan inflation: ${rate}%`,
  growthPercent: (rate: number) => `${rate}% growth`,
} as const;

/** 收入／支出共用側邊編輯器的顯示文字。 */
export const RetirementEntryEditorLabels = {
  titleIncomeAdd: '新增收入',
  titleIncomeEdit: '編輯收入',
  titleExpenseAdd: '新增支出',
  titleExpenseEdit: '編輯支出',
  description: '調整此項目的設定，完成後儲存。',
  addIncomeAction: '新增收入',
  addExpenseAction: '新增支出',
  nameLabel: '名稱',
  namePlaceholder: '例：薪資',
  typeLabel: '類型',
  typePlaceholder: '選擇類型…',
  currentAnnual: '目前年均',
  noValueMarker: '—',
  importHint: '從 Ledger 匯入以填入金額。',
  debtDerivedHint: '由債務還款匯入推導。',
  growth: '成長',
  importSource: '匯入來源',
  advanced: 'Advanced',
  endCondition: '結束條件',
  endConditionAge: '指定年齡',
  endConditionYear: '指定年份',
  endYearReadOnly: '結束年度（由匯入決定）',
  growthRateLabel: '成長率 (%)',
  startYear: '開始年度',
  planInflation: (rate: number) => `Plan inflation ${rate}%`,
  planInflationPlaceholder: 'Plan inflation',
  saveAction: 'Save',
  cancelAction: 'Cancel',
  savingAction: 'Saving…',
  discardTitle: '放棄未儲存的變更？',
  discardContext: '此編輯器有尚未儲存的變更。',
  discardConsequence: '關閉後變更將不會保留。',
  discardConfirm: '放棄',
  discardCancel: '繼續編輯',
  savedIncome: 'INCOME SAVED',
  savedExpense: 'EXPENSE SAVED',
} as const;
