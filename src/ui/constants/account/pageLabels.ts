export const ACCOUNTS_PAGE_LABELS = {
  TITLE: '帳戶管理',
  DESCRIPTION: '管理您的銀行、券商與現金帳戶。',
  CREATE_ACTION: '新增帳戶',
  SUMMARY_SECTION_TITLE: 'SUMMARY',
  LOADING_LABEL: '載入帳戶中',
  LOAD_ERROR: '無法載入帳戶清單。',
  RETRY_ACTION: '重試',
  EMPTY_TITLE: 'NO ACCOUNTS',
  EMPTY_DESCRIPTION: '尚未建立任何帳戶，建立後即可記錄每月結算餘額。',
  FILTER_EMPTY_TITLE: 'NO ACCOUNT IN VIEW',
  FILTER_EMPTY_DESCRIPTION: '目前篩選條件下沒有帳戶，切換為「含停用」可看到全部。',
  FILTER_LABEL: '帳戶狀態篩選',
} as const;

export const ACCOUNT_COLUMN_WIDTHS = [8, 34, 14, 24, 20] as const;

export const ACCOUNT_COLUMN_LABELS = {
  REORDER: '排序',
  NAME: '帳戶',
  STATUS: '狀態',
  BALANCE: '期末餘額',
  AS_OF: '結算月份',
} as const;

/** Status words shared by the list and the detail header. */
export const ACCOUNT_STATUS_LABELS = {
  ACTIVE: '啟用中',
  INACTIVE: '已停用',
} as const;

export const ACCOUNT_SUMMARY_LABELS = {
  TOTAL_BALANCE: '總餘額',
  ACTIVE_ACCOUNTS: '啟用帳戶',
} as const;

export const ACCOUNT_FILTER_ALL = 'all';

export const ACCOUNT_FILTER_ITEMS = [
  { id: 'active', label: '僅啟用中' },
  { id: ACCOUNT_FILTER_ALL, label: '含停用' },
] as const;

/** Shown when an account has no closing balance for the period. */
export const ACCOUNT_BALANCE_MISSING = '$ —';

/** Shown when a value has no source: no period recorded, or no previous period. */
export const ACCOUNT_VALUE_MISSING = '—';

export const accountReorderLabel = (name: string): string => `重新排序 ${name}`;
