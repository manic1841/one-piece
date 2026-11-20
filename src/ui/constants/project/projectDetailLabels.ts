export const PROJECT_DETAIL_LABELS = {
  CRUMB: 'PROJECTS',
  RENAME_FAILED: '無法重新命名專案。',
  UPDATE_FAILED: '無法更新專案狀態。',
  BACK_LABEL: '返回專案清單',
  DEACTIVATE_ACTION: '停用專案',
  ACTIVATE_ACTION: '啟用專案',
  INACTIVE_BADGE: '已停用專案',
  BALANCE_SECTION_TITLE: 'PROJECT BALANCE',
  SUMMARY_SECTION_TITLE: 'SUMMARY',
  DEBT_SECTION_TITLE: 'PROJECT DEBT',
  CASH_FLOW_SECTION_TITLE: 'MONTHLY CASH FLOW',
  AMOUNT_COLUMN: '金額',
  DEBT_LOAN_COLUMN: '貸款',
  DEBT_BALANCE_COLUMN: '未償餘額',
  DEBT_EMPTY_HINT: '此專案沒有連結貸款。',
  CASH_FLOW_EMPTY_HINT: '尚無現金流紀錄。',
  RECORD_EMPTY_HINT: '本月沒有現金流紀錄。',
  LOAD_MORE_ACTION: '載入更早的月份',
  LOAD_MORE_UNKNOWN_HINT: '無法確認是否還有更早的月份，可再載入一次。',
  LOADING_LABEL: '載入專案資料中',
  LOAD_ERROR: '無法載入專案資料。',
  BALANCE_LOAD_ERROR: '無法載入專案餘額。',
  RETRY_ACTION: '重試',
  NOT_FOUND_TITLE: 'NO PROJECT',
  NOT_FOUND_DESCRIPTION: '找不到這個專案，可能已被刪除。',
  NOT_FOUND_ACTION: '返回專案清單',
} as const;

export const PROJECT_DANGER_LABELS = {
  DELETE: '刪除專案',
  DELETE_TITLE: '刪除專案？',
  DELETE_CONSEQUENCE: '刪除後無法復原。',
  CONFIRM: '刪除',
  DELETE_FAILED: '無法刪除專案。',
} as const;

export const PROJECT_SUMMARY_LABELS = {
  INCOME: '收入',
  EXPENSE: '支出',
  NET_CASH_FLOW: '淨現金流',
  /** Window note; the summary never spans more than this. */
  WINDOW_NOTE: '近 12 個月',
} as const;

export const PROJECT_SETTLED_LABELS = {
  PREFIX: '最後結算月份',
  NEVER: '未曾結算',
} as const;

export const PROJECT_DEBT_COLUMN_WIDTHS = [60, 40] as const;

export const PROJECT_SNAPSHOT_COLUMN_WIDTHS = [18, 20, 20, 20, 22] as const;

export const PROJECT_SNAPSHOT_COLUMN_LABELS = {
  MONTH: '月份',
  OPENING: '期初',
  INCOME: '收入',
  EXPENSE: '支出',
  CLOSING: '期末',
} as const;

export const PROJECT_RECORD_COLUMN_WIDTHS = [30, 40, 30] as const;

export const PROJECT_RECORD_COLUMN_LABELS = {
  DATE: '日期',
  CATEGORY: '類別',
  AMOUNT: '金額',
} as const;

export const projectRecordCountLabel = (count: number): string => `${count} 筆`;
