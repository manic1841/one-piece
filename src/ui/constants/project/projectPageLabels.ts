export const PROJECTS_PAGE_LABELS = {
  TITLE: '專案管理',
  DESCRIPTION: '管理專案餘額與排序。',
  CREATE_ACTION: '新增專案',
  LOADING_LABEL: '載入專案中',
  LOAD_ERROR: '無法載入專案清單。',
  RETRY_ACTION: '重試',
  EMPTY_TITLE: 'NO PROJECTS',
  EMPTY_DESCRIPTION: '尚未建立任何專案。',
  FILTER_EMPTY_TITLE: 'NO MATCH',
  FILTER_EMPTY_DESCRIPTION: '目前沒有符合條件的專案。',
  FILTER_LABEL: '專案狀態篩選',
} as const;

export const PROJECT_COLUMN_WIDTHS = [8, 32, 20, 13, 13, 14] as const;

export const PROJECT_COLUMN_LABELS = {
  REORDER: '排序',
  NAME: '名稱',
  STATUS: '狀態',
  INCOME: '收入',
  EXPENSE: '支出',
  NET_CASH_FLOW: '淨現金流',
} as const;

export const PROJECT_STATUS_LABELS = {
  ACTIVE: '進行中',
  INACTIVE: '停用',
} as const;

export const PROJECT_FILTER_ALL = 'all';

export const PROJECT_FILTER_ITEMS = [
  { id: 'active', label: '僅進行中' },
  { id: PROJECT_FILTER_ALL, label: '含停用' },
] as const;

export const projectReorderLabel = (name: string): string => `重新排序 ${name}`;

export const projectActiveCountLabel = (count: number): string => `進行中 ${count} 筆`;
