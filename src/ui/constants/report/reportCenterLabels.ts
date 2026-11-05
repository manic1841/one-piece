import { type ReportViewId } from './reportViewLabels';

/**
 * 報表檢視（清單 / detail / 歷史）的顯示文案。三張報表標題沿用
 * `REPORT_VIEW_TITLES`，不在此複述。
 */
export const REPORT_LIST_LABELS = {
  TITLE: '報表',
  DESCRIPTION: '回看各期間的損益、權益與現金結果。',
  MODE_LABEL: '報表粒度',
  MODE_MONTHLY: '月',
  MODE_YEARLY: '年',
  SUMMARY_NET_INCOME: '淨利',
  SUMMARY_SECTION_TITLE: '期間總結',
  SUMMARY_EQUITY: '期末權益',
  SUMMARY_CASH: '期末現金',
  HISTORY_SECTION_TITLE: '報表歷史',
  COLUMN_PERIOD: '期間',
  COLUMN_NET_INCOME: '淨利',
  COLUMN_EQUITY: '期末權益',
  COLUMN_CASH: '期末現金',
  LOADING: '載入報表中…',
  LOAD_ERROR: '無法載入報表。',
  RETRY_ACTION: '重試',
  EMPTY_TITLE: 'NO REPORTS',
  EMPTY_DESCRIPTION: '完成月度關帳並產生報表後，期間會出現在這裡。',
} as const;

export const ANALYSIS_PATH = '/reports/analysis';

/** 分析頁的區塊錨點；淨資產與收支也是 KPI 的下鑽目的地。 */
export const ANALYSIS_ANCHORS = {
  NET_WORTH: 'net-worth',
  INCOME: 'income',
  CASH_FLOW: 'cash-flow',
} as const;

export const ANALYSIS_RANGE_LABELS = {
  '1y': '1Y',
  '3y': '3Y',
  '5y': '5Y',
  all: 'All',
} as const;

export const REPORT_SUMMARY_LABELS = {
  SECTION_TITLE: '財務摘要',
  TOTAL_ASSETS: '總資產',
  NET_WORTH: '淨資產',
  TOTAL_LIABILITIES: '總負債',
  SAVINGS_RATE: '儲蓄率',
  VIEW_ANALYSIS: '查看完整分析',
  UNCLOSED: '未關帳',
  MISSING: '—',
  ARIA_TOTAL_ASSETS: '總資產，前往淨資產趨勢',
  ARIA_NET_WORTH: '淨資產，前往淨資產趨勢',
  ARIA_TOTAL_LIABILITIES: '總負債，前往淨資產趨勢',
  ARIA_SAVINGS_RATE: '儲蓄率，前往收支分析',
} as const;

export const REPORT_ANALYSIS_LABELS = {
  TITLE: '歷史財務分析',
  CRUMB: '報表',
  BACK: '返回報表',
  LOADING: '載入分析中…',
  LOAD_ERROR: '無法載入分析資料。',
  RETRY_ACTION: '重試',
  EMPTY_TITLE: 'NO REPORTS',
  EMPTY_DESCRIPTION: '完成月度關帳並產生資產負債表後，這裡會出現趨勢。',
  RANGE_LABEL: '分析範圍',
  NET_WORTH_SECTION: '淨資產趨勢',
  INCOME_SECTION: '收支與儲蓄率',
  CASH_FLOW_SECTION: '淨現金流',
  NET_WORTH: '淨資產',
  TOTAL_ASSETS: '總資產',
  TOTAL_LIABILITIES: '總負債',
  INCOME: '收入',
  EXPENSE: '支出',
  SAVINGS_RATE: '儲蓄率',
  SAVINGS_RATE_UNIT: '儲蓄率 %',
  NET_CASH_FLOW: '淨現金流',
  SAVINGS_FORMULA: '儲蓄率 = (收入 − 支出) ÷ 收入，以損益表為準，不等於現金流。',
  CASH_FLOW_HINT: '淨現金流是現金基礎，與上方的應計收支不同。',
  UNCLOSED_MARKER: '未關帳',
  UNCLOSED_OVERFLOW_SUFFIX: (first: string, count: number) => `${first} 起等 ${count} 期`,
  UNCLOSED_HISTORY_LINK: '查看報表歷史',
  INSUFFICIENT: '此範圍內不足 2 期',
  DESCRIPTION: (cutoff: string, unclosedCount: number) =>
    `資料截至 ${cutoff}，含 ${unclosedCount} 期未關帳`,
  NET_WORTH_ARIA: (visible: string) => `淨資產趨勢，顯示：${visible}`,
  INCOME_ARIA: (visible: string) => `收支與儲蓄率，顯示：${visible}`,
  CASH_FLOW_ARIA: (visible: string) => `淨現金流，顯示：${visible}`,
  DASH: REPORT_SUMMARY_LABELS.MISSING,
} as const;

export const REPORT_DETAIL_LABELS = {
  BACK_CRUMB: '報表',
  PREVIOUS_PERIOD: '上一期',
  NEXT_PERIOD: '下一期',
  GO_TO_CLOSE: '前往關帳',
  LOADING: '載入報表中…',
  LOAD_ERROR: '無法載入這份報表。',
  RETRY_ACTION: '重試',
  EMPTY_TITLE: 'NO REPORT',
  EMPTY_DESCRIPTION: '這個期間沒有已產生的報表。完成關帳並產生報表後即可查看。',
  ACTUAL_BALANCE_LABEL: '實際餘額',
  TABS_LABEL: '報表檢視',
} as const;

/** 報表 detail 的 tabs，順序固定為損益表 / 資產負債表 / 現金流量表。 */
export const REPORT_TAB_ORDER: readonly ReportViewId[] = [
  'INCOME_STATEMENT',
  'BALANCE_SHEET',
  'CASH_FLOW',
];
