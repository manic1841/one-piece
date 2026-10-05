import { type ReportViewId } from './reportViewLabels';

/**
 * 報表中心（清單 / detail / 歷史）的顯示文案。三張報表標題沿用
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

export const REPORT_DETAIL_LABELS = {
  BACK_CRUMB: '報表',
  BACK_ACTION: '返回報表清單',
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

export const REPORT_PERIOD_LABELS = {
  INVALID_PARAM: '報表期間格式不正確。',
} as const;
