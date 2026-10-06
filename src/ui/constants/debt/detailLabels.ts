/** 貸款詳情頁的靜態文案，比照 `constants/account/detailLabels.ts`。 */
export const DEBT_DETAIL_LABELS = {
  CRUMB: 'DEBT',
  BACK_LABEL: '返回債務列表',
  EDIT_ACTION: '編輯貸款',
  ACTIVATE_ACTION: '啟用貸款',
  DEACTIVATE_ACTION: '停用貸款',
  OUTSTANDING_BALANCE_SECTION_TITLE: 'OUTSTANDING BALANCE',
  LOAN_INFO_SECTION_TITLE: 'LOAN INFORMATION',
  TREND_SECTION_TITLE: '12M TREND',
  HISTORY_SECTION_TITLE: 'HISTORY',
  ORIGINAL_LABEL: 'Original',
  MONTHLY_PAYMENT_LABEL: 'Monthly Payment',
  INTEREST_RATE_LABEL: 'Interest Rate',
  PERIOD_LABEL: 'Period',
  LOADING_LABEL: '載入中…',
  LOAD_ERROR: '無法載入貸款資料。',
  RETRY_ACTION: '重試',
  NOT_FOUND_TITLE: '找不到貸款',
  NOT_FOUND_DESCRIPTION: '此貸款可能已被刪除，或你不屬於它所屬的家庭。',
  NOT_FOUND_ACTION: '返回債務列表',
  TREND_EMPTY_HINT: '尚無月度結算資料',
} as const;

export const DEBT_DANGER_LABELS = {
  DELETE: '刪除貸款',
  DELETE_TITLE: '刪除貸款？',
  DELETE_CONSEQUENCE: '刪除後無法復原。',
  CONFIRM: '刪除',
} as const;

export const DEBT_LIFECYCLE_LABELS = {
  DISABLE_TITLE: 'Disable this loan?',
  DISABLE_CONTEXT: 'It will be hidden from the debt list and excluded from totals.',
  DISABLE_CONSEQUENCE: 'You can re-enable it later from the edit dialog.',
  DISABLE_CONFIRM: 'DISABLE',
} as const;

export const debtInterestRateLabel = (rate: number): string => `年利率 ${rate}%`;
