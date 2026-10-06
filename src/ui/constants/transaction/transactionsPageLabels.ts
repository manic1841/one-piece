import { getIntentTypeLabel } from './displayLabels';

/** 交易清單頁專屬的表面文字；非頁面層的欄位／科目標籤留在 displayLabels。 */
export const TRANSACTIONS_PAGE_TITLE = '交易';
export const TRANSACTIONS_PAGE_DESCRIPTION = '管理你的收入、支出與資金流動。';
export const TRANSACTIONS_PAGE_SEARCH_PLACEHOLDER = '搜尋交易或備註...';
export const TRANSACTIONS_PAGE_SEARCH_LABEL = '搜尋交易';
export const TRANSACTIONS_PAGE_FILTER_LABEL = '交易類型篩選';
export const TRANSACTIONS_PAGE_LOADING_LABEL = '載入交易紀錄中';
export const TRANSACTIONS_PAGE_EMPTY_TITLE = 'NO DATA';
export const TRANSACTIONS_PAGE_EMPTY_DESCRIPTION = '目前期間沒有任何交易紀錄。';
export const TRANSACTIONS_PAGE_FILTER_EMPTY_TITLE = 'NO MATCH';
export const TRANSACTIONS_PAGE_FILTER_EMPTY_DESCRIPTION = '沒有符合搜尋或篩選條件的交易。';
export const TRANSACTIONS_PAGE_CREATE_ACTION = '新增交易';
export const TRANSACTIONS_PAGE_RETRY_ACTION = '重試';
export const TRANSACTIONS_PAGE_DELETE_CONFIRM_TITLE = 'Delete this transaction?';
export const TRANSACTIONS_PAGE_DELETE_CONFIRM_CONTEXT =
  'Related allocation data will be removed as well.';
export const TRANSACTIONS_PAGE_EDIT_MISSING_TITLE = '找不到要編輯的交易資料。';
export const TRANSACTIONS_PAGE_EDIT_UNSUPPORTED_TITLE = '目前不支援編輯此交易。';
export const TRANSACTIONS_PAGE_SAVED_TOAST = '交易已儲存';
export const TRANSACTIONS_PAGE_DELETED_TOAST = '交易已刪除';

export const TRANSACTION_FILTER_ALL = 'ALL';

export const TRANSACTION_FILTER_ITEMS = [
  { id: TRANSACTION_FILTER_ALL, label: '全部' },
  { id: 'EXPENSE', label: getIntentTypeLabel('EXPENSE') },
  { id: 'INCOME', label: getIntentTypeLabel('INCOME') },
  { id: 'INVESTMENT', label: getIntentTypeLabel('INVESTMENT') },
  { id: 'FINANCING', label: getIntentTypeLabel('FINANCING') },
] as const;
