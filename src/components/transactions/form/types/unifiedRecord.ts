import { type Transaction, type PlannedIncome, type ProjectTransaction } from '../../../../schemas';
import { TransactionType } from '@/domains/transaction/transactionType';
import { FormType } from './formType';

export type AnyRecord = Transaction | PlannedIncome | ProjectTransaction;

export const RecordType = {
  transaction: 'transaction',
  plannedIncome: 'plannedIncome',
  projectTransaction: 'projectTransaction',
} as const;

export type RecordType = (typeof RecordType)[keyof typeof RecordType];

export interface UnifiedRecord {
  recordType?: RecordType;
  formType: FormType;

  id?: string;
  date: string;
  amount: string;
  category?: string;
  description: string;
  createdBy?: string;
  createdAt?: string;

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
  incomeSource?: string;
  // transaction
  transactionType?: TransactionType;
}

export const normalizeRecord = (record?: AnyRecord): UnifiedRecord => {
  if (!record)
    return {
      formType: FormType.expense,
      date: new Date().toISOString(),
      amount: '',
      description: '',
    };

  if ('projectId' in record) {
    const txn = record as Transaction;
    return {
      id: txn.id,
      recordType: RecordType.transaction,
      formType: txn.type === 'income' ? FormType.income : FormType.expense,
      date: txn.date.toISOString(),
      category: txn.category,
      amount: txn.amount.toString(),
      description: txn.description || '',
      createdBy: txn.createdBy,
      createdAt: txn.createdAt.toISOString(),
      mainProjectId: txn.projectId,
      transactionType: txn.type,
    };
  }
  if ('allocation' in record) {
    const income = record as PlannedIncome;
    return {
      id: income.id,
      recordType: RecordType.plannedIncome,
      formType: FormType.income,
      date: income.date.toISOString(),
      category: income.category,
      amount: income.amount.toString(),
      description: income.description || '',
      createdBy: income.createdBy,
      createdAt: income.createdAt.toISOString(),

      allocations: income.allocations,
    };
  }
  if ('fromProjectId' in record) {
    const pt = record as ProjectTransaction;
    return {
      id: pt.id,
      recordType: RecordType.projectTransaction,
      formType: FormType.transfer,
      date: pt.date.toISOString(),
      amount: pt.amount.toString(),
      description: pt.description || '',
      createdBy: pt.createdBy,
      createdAt: pt.createdAt.toISOString(),
      mainProjectId: pt.toProject,
      sourceProjectId: pt.fromProject,
      incomeSource: pt.incomeSource,
    };
  }

  throw new Error('Invalid record type');
};

// convert normalizedRecord to schema
export const convertToSchema = (record: UnifiedRecord, type: RecordType): AnyRecord => {
  if (type === RecordType.transaction) {
    return {
      id: record.id,
      type: record.transactionType,
      date: new Date(record.date),
      category: record.category,
      amount: Number(record.amount),
      description: record.description,
      projectId: record.mainProjectId,
    } as Transaction;
  }
  if (type === RecordType.plannedIncome) {
    return {
      id: record.id,
      category: record.category,
      amount: Number(record.amount),
      date: new Date(record.date),
      description: record.description,
      allocations: record.allocations,
    } as PlannedIncome;
  }
  if (type === RecordType.projectTransaction) {
    return {
      id: record.id,
      fromProject: record.sourceProjectId,
      toProject: record.mainProjectId,
      amount: Number(record.amount),
      date: new Date(record.date),
      description: record.description,
      incomeSource: record.incomeSource,
    } as ProjectTransaction;
  }

  throw new Error('Invalid record type');
};
