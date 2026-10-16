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
  baseline: 'FINANCIAL BASELINE',
  events: 'LIFE EVENTS',
} as const;

export type RetirementWorkspaceSectionKey = keyof typeof RetirementWorkspaceSectionLabels;

export const RetirementWorkspaceTermLabels = {
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
  previewTitle: '預覽',
  previewFinalNetWorth: '最終資產',
  previewMinSavings: '最低資產',
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
  editAction: 'Edit',
  deleteAction: 'Delete',
  eventEmpty: 'No life events defined yet. Click Add Event to get started.',
  phaseCount: (count: number) => `${count} phases`,
} as const;

/**
 * Financial Baseline 區域（spec #301 §4）：合併原 Income 與 Living Expenses，
 * 作為 ledger 來源的管理視圖。
 */
export type RetirementBaselineFilter = 'all' | 'income' | 'expense' | 'debt';

export const RetirementBaselineLabels = {
  filterAriaLabel: '基準列篩選',
  filterAll: '全部',
  filterIncome: '收入',
  filterExpense: '支出',
  filterDebt: '債務',
  columnName: '名稱',
  columnSource: '資料來源',
  columnBaseAmount: '基準年金額',
  columnGrowth: '成長率',
  columnEndCondition: '結束條件',
  columnActions: '動作',
  /** 沒有匯入來源（`currentAnnual` 為空）的舊列，仍保留但唯讀。 */
  noSource: '—',
  growthInflation: 'Inflation',
  growthPercent: (rate: number) => `${rate}% growth`,
  emptyTitle: 'NO BASELINE DATA',
  emptyDescription:
    '基準列由 Ledger 匯入產生。匯入後即可檢視與編輯；未來才發生的收支請改用 Life Event 表達。',
  filterEmptyTitle: 'NO MATCHING ROWS',
  filterEmptyDescription: '此篩選沒有符合的基準列。',
  loading: '載入中',
  loadError: '無法載入基準資料。',
  retryAction: '重試',
  deletedRowToast: 'ROW DELETED',
  /** Import completed successfully (spec #301 §2.4). */
  importedToast: 'IMPORTED',
  /** Rows kept because their ledger source was not in the import (spec #301 §4.3). */
  unmatchedNotice: (count: number) => `${count} 列未對應到來源`,
  unmatchedNoticeDismiss: '關閉',
} as const;

export const RetirementBaselineFilterItems: ReadonlyArray<{
  id: RetirementBaselineFilter;
  label: string;
}> = [
  { id: 'all', label: RetirementBaselineLabels.filterAll },
  { id: 'income', label: RetirementBaselineLabels.filterIncome },
  { id: 'expense', label: RetirementBaselineLabels.filterExpense },
  { id: 'debt', label: RetirementBaselineLabels.filterDebt },
];

/** 六欄（名稱／資料來源／基準年金額／成長率／結束條件／動作），總和為 100。 */
export const RETIREMENT_BASELINE_COLUMN_WIDTHS: readonly number[] = [24, 20, 16, 14, 16, 10];

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

/**
 * 假設變更重算（spec #301 §3.4）：年份搬動的確認與 `summary` 過時提示。
 * 搬動只針對已存的「退休時結束」列。
 */
export const RetirementRecalculationLabels = {
  yearShiftTitle: '搬動結束年份？',
  yearShiftContext: '假設變更會移動「退休時結束」列的結束年份。',
  yearShiftConsequence:
    '僅已儲存的「退休時結束」列會搬動；指定年齡、持續至預期壽命與匯入列不受影響。',
  yearShiftConfirm: '搬動',
  yearShiftCancel: '不搬動',
  summaryStaleNotice: '計畫摘要已過時，請點擊「重新計算」以更新。',
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

/**
 * Life Events Data Table（spec #301 §5.1 Data Table 側、§5.2、§5.5）。
 *
 * 事件清單為明細／管理視圖：列 = 事件（沿用既有呈現：終身費用總和、phase 數量註記、
 * `+`／`-` 標示），編輯一律經側邊編輯器。phase 命名：主名＝所屬 Event 名；
 * 副標＝`phase.name`（留空則不顯示、不回退）。
 */
export type RetirementEventsFilter = 'all' | 'income' | 'expense';

export const RetirementEventsLabels = {
  filterAriaLabel: '事件篩選',
  filterAll: '全部',
  filterIncome: '收入',
  filterExpense: '支出',
  columnName: '名稱',
  columnType: '類型',
  columnYears: '年份',
  columnAmount: '終身費用總和',
  columnActions: '動作',
  typeIncome: '收入',
  typeExpense: '支出',
  addEventAction: '新增事件',
  addPhaseAction: '新增階段',
  editPhaseAction: '編輯階段',
  removePhaseAction: '移除階段',
  titleEventAdd: '新增事件',
  titleEventEdit: '編輯事件',
  description: '設定事件與其階段，完成後儲存。',
  nameLabel: '事件名稱',
  namePlaceholder: '例：購屋頭期款',
  typeLabel: '類型',
  phasesLabel: '階段',
  phaseNameLabel: '階段名稱（選填）',
  phaseNamePlaceholder: '階段名稱（選填）',
  startYear: '開始年度',
  endYear: '結束年度',
  amount: '金額',
  growthRate: '成長率 (%)',
  growthPlaceholder: '計畫通膨',
  noteLabel: '備註（選填）',
  notePlaceholder: '補充說明…',
  saveAction: 'Save',
  cancelAction: 'Cancel',
  savingAction: 'Saving…',
  discardTitle: '放棄未儲存的變更？',
  discardContext: '此編輯器有尚未儲存的變更。',
  discardConsequence: '關閉後變更將不會保留。',
  discardConfirm: '放棄',
  discardCancel: '繼續編輯',
  savedEvent: 'EVENT SAVED',
  savedPhase: 'PHASE SAVED',
  deletedEventToast: 'EVENT DELETED',
  deletedPhaseToast: 'PHASE DELETED',
  updatedPhaseToast: 'PHASE UPDATED',
  emptyTitle: 'NO LIFE EVENTS',
  emptyDescription: '新增人生事件以描述未來的收入或支出。',
  filterEmptyTitle: 'NO MATCHING EVENTS',
  filterEmptyDescription: '此篩選沒有符合的事件。',
  loadingLabel: '載入中…',
  loadError: '無法載入人生事件。',
  retryAction: '重試',
  growthInflation: 'Inflation',
  growthPercent: (rate: number) => `${rate}% growth`,
} as const;

export const RetirementEventsFilterItems: ReadonlyArray<{
  id: RetirementEventsFilter;
  label: string;
}> = [
  { id: 'all', label: RetirementEventsLabels.filterAll },
  { id: 'income', label: RetirementEventsLabels.filterIncome },
  { id: 'expense', label: RetirementEventsLabels.filterExpense },
];

/** 五欄（名稱／類型／年份／終身費用總和／動作），總和為 100。 */
export const RETIREMENT_EVENTS_COLUMN_WIDTHS: readonly number[] = [30, 12, 18, 22, 18];

/**
 * Life Events Timeline（spec #301 §5.1 Timeline 側、§5.3–§5.5）。
 * 與 Data Table 為區域內互斥切換；每 phase 一條 bar、依 Event 分列、tone 著色、不顯示金額。
 */
export type RetirementLifeEventsView = 'table' | 'timeline';

export const RetirementLifeEventsViewLabels = {
  ariaLabel: 'Life Events 視圖切換',
  table: 'Data Table',
  timeline: 'Timeline',
} as const;

export const RetirementLifeEventsViewItems: ReadonlyArray<{
  id: RetirementLifeEventsView;
  label: string;
}> = [
  { id: 'table', label: RetirementLifeEventsViewLabels.table },
  { id: 'timeline', label: RetirementLifeEventsViewLabels.timeline },
];

export const RetirementTimelineLabels = {
  ariaLabel: '人生事件時間軸',
  windowLabel: 'WINDOW',
  eventYearColumn: 'EVENT / YEAR',
  /** 年份尺為裝飾、平移只由 WINDOW 列按鈕（spec #301 §5.4）。 */
  panBackAria: (step: number) => `視窗左移 ${step} 年`,
  panForwardAria: (step: number) => `視窗右移 ${step} 年`,
  panToStartAria: '視窗回到投影起始年',
  addPhaseAction: '新增階段',
  openEditorAction: '編輯階段',
  /** 行動版具名控制：換 Event（spec #301 §5.4）。 */
  reassignLabel: '所屬 Event',
} as const;
