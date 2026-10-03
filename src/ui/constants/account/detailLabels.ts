export const ACCOUNT_DETAIL_LABELS = {
  CRUMB: 'ACCOUNTS',
  BACK_LABEL: '返回帳戶清單',
  DEACTIVATE_ACTION: '停用帳戶',
  ACTIVATE_ACTION: '啟用帳戶',
  BASIC_INFO_SECTION_TITLE: 'BASIC INFO',
  ENDING_BALANCE_SECTION_TITLE: 'ENDING BALANCE',
  TREND_SECTION_TITLE: '12M TREND',
  HISTORY_SECTION_TITLE: '12M HISTORY',
  INACTIVE_BADGE: '停用帳戶',
  NAME_LABEL: '帳戶名稱',
  TYPE_LABEL: '類別',
  CURRENCY_LABEL: '幣別',
  CREATED_LABEL: '建立日期',
  BALANCE_LABEL: '期末餘額',
  CHANGE_LABEL: '增減',
  HOLDINGS_LABEL: '持倉',
  LOADING_LABEL: '載入帳戶資料中',
  LOAD_ERROR: '無法載入帳戶資料。',
  RETRY_ACTION: '重試',
  NOT_FOUND_TITLE: 'NO ACCOUNT',
  NOT_FOUND_DESCRIPTION: '找不到這個帳戶，可能已被刪除。',
  NOT_FOUND_ACTION: '返回帳戶清單',
  TREND_EMPTY_HINT: '尚無結算資料，完成本月關帳後顯示趨勢',
  HISTORY_EMPTY_HINT: '目前尚無結算紀錄，完成本月關帳後顯示歷史。',
  HOLDINGS_EMPTY_HINT: '此期間沒有持倉紀錄。',
} as const;

/** History columns: expand affordance, period, closing balance, change, holdings count. */
export const ACCOUNT_HISTORY_COLUMN_WIDTHS = [10, 24, 26, 22, 18] as const;

export const ACCOUNT_HISTORY_COLUMN_LABELS = {
  EXPAND: '持倉明細',
  PERIOD: '期間',
  BALANCE: '期末餘額',
  CHANGE: '增減',
  HOLDINGS: '持倉',
} as const;

export const ACCOUNT_HOLDING_COLUMN_WIDTHS = [16, 30, 22, 22, 10] as const;

export const ACCOUNT_HOLDING_COLUMN_LABELS = {
  SYMBOL: '代號',
  NAME: '名稱',
  COST: '成本',
  VALUE: '市值',
  LEVERAGE: '槓桿',
} as const;

export const accountHoldingsCountLabel = (count: number): string => `${count} 檔`;

export const accountHoldingRowLabel = (period: string): string => `展開 ${period} 持倉`;
