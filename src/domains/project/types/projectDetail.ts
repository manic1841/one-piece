import type { ProjectTransactionCategory, TransactionCategory } from '@/domains/record/types';

export const ProjectDetailType = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER_INCOME: 'transfer-income',
  TRANSFER_EXPENSE: 'transfer-expense',
} as const;

export type ProjectDetailType = (typeof ProjectDetailType)[keyof typeof ProjectDetailType];

export interface ProjectDetailData {
  id: string;
  type: ProjectDetailType;
  category: TransactionCategory | ProjectTransactionCategory;
  date: Date;
  amount: number;
  label: string;
  description: string;
}
