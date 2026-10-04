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
