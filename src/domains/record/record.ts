import { type Transaction, type PlannedIncome, type ProjectTransaction } from '@/schemas';
import { TransactionType } from '@/domains/record/transactionType';
import { FormType } from './formType';

export type AnyRecord = Transaction | PlannedIncome | ProjectTransaction;

export const RecordType = {
  TRNASACTION: 'transaction',
  PLANNED_INCOME: 'plannedIncome',
  PROJECT_TRANSACTION: 'projectTransaction',
} as const;

export type RecordType = (typeof RecordType)[keyof typeof RecordType];

export interface Record {
  recordType?: RecordType;
  formType: FormType;

  id?: string;
  date: Date;
  amount: number;
  category?: string;
  description: string;
  createdBy?: string;
  createdAt?: Date;

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

export const unifyRecord = (record?: AnyRecord): Record => {
  console.log('record', record);
  if (!record) {
    console.log('no record');
    return {
      formType: FormType.EXPENSE,
      date: new Date(),
      amount: 0,
      description: '',
      category: '',
      mainProjectId: '',
      sourceProjectId: '',
      incomeSource: '',
      allocations: [],
      transactionType: TransactionType.EXPENSE,
    };
  }

  if ('projectId' in record) {
    console.log('transaction');
    const txn = record as Transaction;
    return {
      id: txn.id,
      recordType: RecordType.TRNASACTION,
      formType: txn.type === TransactionType.INCOME ? FormType.INCOME : FormType.EXPENSE,
      date: txn.date,
      category: txn.category,
      amount: txn.amount,
      description: txn.description || '',
      createdBy: txn.createdBy,
      createdAt: txn.createdAt,
      mainProjectId: txn.projectId,
      transactionType: txn.type,
    };
  }
  if ('allocations' in record) {
    console.log('planned income');
    const income = record as PlannedIncome;
    return {
      id: income.id,
      recordType: RecordType.PLANNED_INCOME,
      formType: FormType.INCOME,
      date: income.date,
      category: income.category,
      amount: income.amount,
      description: income.description || '',
      createdBy: income.createdBy,
      createdAt: income.createdAt,

      allocations: income.allocations,
    };
  }
  if ('fromProject' in record || 'toProject' in record) {
    console.log('project transaction');
    const pt = record as ProjectTransaction;
    return {
      id: pt.id,
      recordType: RecordType.PROJECT_TRANSACTION,
      formType: FormType.TRANSFER,
      date: pt.date,
      amount: pt.amount,
      description: pt.description || '',
      createdBy: pt.createdBy,
      createdAt: pt.createdAt,
      mainProjectId: pt.toProject,
      sourceProjectId: pt.fromProject,
      incomeSource: pt.incomeSource,
    };
  }

  throw new Error('Invalid record type');
};

// convert record to schema
export const transactionConverter = (record: Record) => {
  return {
    id: record.id,
    type: record.transactionType,
    date: new Date(record.date),
    category: record.category,
    amount: Number(record.amount),
    description: record.description,
    projectId: record.mainProjectId,
  } as Transaction;
};

export const plannedIncomeConverter = (record: Record) => {
  return {
    id: record.id,
    category: record.category,
    amount: Number(record.amount),
    date: new Date(record.date),
    description: record.description,
    allocations: record.allocations,
  } as PlannedIncome;
};

export const projectTransactionConverter = (record: Record) => {
  return {
    id: record.id,
    fromProject: record.sourceProjectId,
    toProject: record.mainProjectId,
    amount: Number(record.amount),
    date: new Date(record.date),
    description: record.description,
    incomeSource: record.incomeSource,
  } as ProjectTransaction;
};

export const toSchema = (record: Record, type: RecordType): AnyRecord => {
  const converter = converters[type];
  if (!converter) throw new Error(`No converter for ${type}`);
  return converter(record);
};
export const converters = {
  [RecordType.TRNASACTION]: transactionConverter,
  [RecordType.PLANNED_INCOME]: plannedIncomeConverter,
  [RecordType.PROJECT_TRANSACTION]: projectTransactionConverter,
} as const;
