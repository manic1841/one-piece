import { DebtType } from '@/domains/debt/schemas';

export const DebtTypeLabels: Record<DebtType, string> = {
  mortgage: '房貸',
  loan: '信貸',
};

export const DebtTypeOptions = DebtType.options.map((value) => ({
  value,
  label: DebtTypeLabels[value],
}));

export const DEBT_STATUS_SETTLED_LABEL = '已結清';
export const DEBT_STATUS_INACTIVE_LABEL = '已停用';
export const DEBT_STATUS_GRACE_PERIOD_LABEL = '寬限期';

export const DEBT_NO_PROJECT_LABEL = '— 無 —';

export const DEBT_SUMMARY_LABELS = {
  TOTAL_OUTSTANDING: '貸款總額',
  ACTIVE_ACCOUNTS: '啟用貸款',
} as const;

export const DEBT_FILTER_ALL = 'all';

export const DEBT_FILTER_ITEMS = [
  { id: 'active', label: '僅啟用中' },
  { id: DEBT_FILTER_ALL, label: '含停用' },
] as const;

export const DEBT_FILTER_LABEL = '貸款狀態篩選';

export const DEBT_LIST_LABELS = {
  TITLE: '債務管理',
  DESCRIPTION: '追蹤所有貸款與還款進度',
  CREATE_ACTION: '新增貸款',
  EDIT_TITLE: '編輯貸款',
  SUMMARY_SECTION_TITLE: 'SUMMARY',
  LOADING_LABEL: '載入中…',
  LOAD_ERROR: '無法載入貸款清單。',
  RETRY_ACTION: '重試',
  EMPTY_TITLE: '尚無貸款紀錄',
  EMPTY_DESCRIPTION: '點擊「新增貸款」開始建立。',
  FILTER_EMPTY_TITLE: '沒有符合的貸款',
  FILTER_EMPTY_DESCRIPTION: '目前沒有符合條件的貸款。',
  SUBMIT_CREATE: '新增',
  SUBMIT_EDIT: '儲存',
} as const;

export const DEBT_COLUMN_LABELS = {
  NAME: 'Loan Name',
  TYPE: 'Type',
  OUTSTANDING_BALANCE: 'Outstanding Balance',
  MONTHLY_PAYMENT: 'Monthly Payment',
  AS_OF: 'As of',
  MOBILE_TYPE: '類型',
  MOBILE_MONTHLY_PAYMENT: '每月應付',
  MOBILE_AS_OF: '截至',
} as const;
