import { type Transaction, type PlannedIncome } from '@/schemas';
import { type ProjectTransaction } from '@/domains/record/types';
import { TransactionType } from '@/domains/record/types/transactionType';
import { RecordFormType } from '@/domains/record/types';

export type AnyRecord = Transaction | PlannedIncome | ProjectTransaction;

export const RecordType = {
  TRANSACTION: 'transaction',
  PLANNED_INCOME: 'plannedIncome',
  PROJECT_TRANSACTION: 'projectTransaction',
} as const;

export type RecordType = (typeof RecordType)[keyof typeof RecordType];

export interface Record {
  recordType?: RecordType;
  formType: RecordFormType;

  id?: string;
  date: Date;
  amount: number;
  category?: string;
  description: string;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;

  // for
  // transaction.projectId,
  // projectTransaction.toProjectId
  mainProjectId?: string | null;
  // for projectTransaction.fromProjectId
  sourceProjectId?: string | null;

  // plannedIncome
  allocations?: {
    projectId: string;
    percentage: number;
  }[];
  // projectTransaction
  incomeSource?: string | null;
  // transaction
  transactionType?: TransactionType;
}
