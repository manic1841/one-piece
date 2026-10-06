/**
 * Portfolio feature 的靜態文案集中處（ui-labeling guideline rule 7）。
 *
 * 分區塊比照 `constants/debt/label.ts` 的單檔風格：頁面 / 欄位 / 明細 / 效能表 /
 * 表單 / lifecycle / danger zone。動態字串以函式承載。
 */

export const PORTFOLIO_PAGE_LABELS = {
  TITLE: '投資組合',
  DESCRIPTION: '分析投資表現：一個證券帳戶連結一個銀行帳戶',
  CREATE_ACTION: '新增組合',
  LOADING_LABEL: '載入投資組合中',
  LOAD_ERROR: '無法載入投資組合清單。',
  RETRY_ACTION: '重試',
  EMPTY_TITLE: 'NO PORTFOLIOS',
  EMPTY_DESCRIPTION: '尚未建立任何投資組合。',
  TOTAL_VALUE_LABEL: 'TOTAL PORTFOLIO VALUE',
} as const;

export const PORTFOLIO_COLUMN_WIDTHS = [10, 26, 18, 16, 18, 12] as const;

export const PORTFOLIO_COLUMN_LABELS = {
  REORDER: '排序',
  NAME: 'Name',
  SECURITIES: 'Securities',
  BANK: 'Bank',
  VALUE: 'Portfolio Value',
  RETURN: 'Return',
} as const;

export const PORTFOLIO_DETAIL_LABELS = {
  DESCRIPTION: '一個證券帳戶連結一個銀行帳戶',
  CRUMB: 'PORTFOLIOS',
  LOADING_LABEL: '載入投資組合中',
  LOAD_ERROR: '無法載入投資組合。',
  RETRY_ACTION: '重試',
  NOT_FOUND_TITLE: '找不到投資組合',
  NOT_FOUND_DESCRIPTION: '此投資組合可能已被刪除，或你不屬於它所屬的家庭。',
  BACK_ACTION: '返回投資組合列表',
  VALUE_SECTION: 'PORTFOLIO VALUE',
  BREAKDOWN_SECTION: 'VALUE BREAKDOWN',
  RETURN_SECTION: 'RETURN',
  RETURN_METHOD_LABEL: '報酬計算方式',
  RETURN_METHOD_TOOLTIP: 'Modified-Dietz：報酬率 = 報酬 ÷（期初價值 + 淨金流 ÷ 2）。',
  TREND_SECTION: '12M PORTFOLIO VALUE',
  PERFORMANCE_SECTION: 'MONTHLY PERFORMANCE',
  RETURN_CALCULATION_SECTION: 'RETURN CALCULATION',
  SECURITIES: 'Securities',
  BANK: 'Bank',
  MONTHLY: 'Monthly',
  CUMULATIVE: 'Cumulative',
  PREVIOUS_VALUE: 'Previous Portfolio Value',
  CURRENT_VALUE: 'Current Portfolio Value',
  INVESTMENT_CASH_FLOW: 'Investment Cash Flow',
  CALCULATED_RETURN: 'Calculated Return',
  NO_SNAPSHOT: '尚無快照資料',
} as const;

export const PORTFOLIO_PERFORMANCE_COLUMN_WIDTHS = [22, 20, 18, 20, 20] as const;

export const PORTFOLIO_PERFORMANCE_COLUMN_LABELS = {
  DATE: 'Date',
  TOTAL_VALUE: 'Total Value',
  RETURN: 'Return',
  CUMULATIVE: 'Cumulative %',
  NET_FLOW: 'Net Flow',
} as const;

export const PORTFOLIO_FORM_LABELS = {
  CREATE_TITLE: 'Create Portfolio',
  NAME: 'Name',
  NAME_PLACEHOLDER: 'e.g., Retirement Fund',
  SECURITIES_ACCOUNT: 'Securities Account',
  SECURITIES_PLACEHOLDER: 'Select securities account',
  BANK_ACCOUNT: 'Bank Account',
  BANK_PLACEHOLDER: 'Select bank account',
  CANCEL: 'Cancel',
  SAVING: 'Saving...',
  SUBMIT: 'Create Portfolio',
} as const;

export const PORTFOLIO_LIFECYCLE_LABELS = {
  INACTIVE: '已停用',
  ACTIVATE: '啟用組合',
  DEACTIVATE: '停用組合',
  DEACTIVATE_TITLE: '停用這個投資組合？',
  DEACTIVATE_CONTEXT: '它將從投資組合列表隱藏，並排除於總額之外。',
  DEACTIVATE_CONSEQUENCE: '之後可以隨時重新啟用。',
} as const;

export const PORTFOLIO_DANGER_LABELS = {
  DELETE: '刪除投資組合',
  DELETE_TITLE: '刪除投資組合？',
  DELETE_DESCRIPTION: '刪除後無法復原，相關快照也會一併移除。',
  CONFIRM: '刪除',
} as const;

export const portfolioReorderLabel = (name: string): string => `重新排序 ${name}`;
