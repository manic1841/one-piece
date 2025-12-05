import type { RecordCategory, RecordType } from '@/domains/record/types/';

export const RecordFormType = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
} as const;

export type RecordFormType = (typeof RecordFormType)[keyof typeof RecordFormType];

export const RecordFormTitles = {
  CREATE: '建立記錄',
  EDIT: '編輯記錄',
} as const;

export type RecordFormTitles = (typeof RecordFormTitles)[keyof typeof RecordFormTitles];

export interface RecordFormData {
  recordType?: RecordType;
  formType: RecordFormType;
  amount: string;
  date: string;
  category: RecordCategory;
  projectId: string;
  description: string;
  allocations: Array<{
    projectId: string;
    percentage: string;
  }>;
  fromProjectId: string;
  toProjectId: string;
}
