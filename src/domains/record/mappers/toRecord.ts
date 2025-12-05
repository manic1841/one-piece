import type {
  AnyRecord,
  Record,
  Transaction,
  PlannedIncome,
  ProjectTransaction,
} from '@/domains/record/types';
import { RecordType, RecordFormType, TransactionType } from '@/domains/record/types';

const mapTransactionToRecord = (txn: Transaction): Record => {
  return {
    id: txn.id,
    recordType: RecordType.TRANSACTION,
    formType: txn.type === TransactionType.INCOME ? RecordFormType.INCOME : RecordFormType.EXPENSE,
    date: txn.date,
    category: txn.category,
    amount: txn.amount,
    description: txn.description || '',
    createdBy: txn.createdBy,
    createdAt: txn.createdAt,
    updatedBy: txn.updatedBy,
    updatedAt: txn.updatedAt,
    projectId: txn.projectId,
    transactionType: txn.type,
  };
};

const mapPlannedIncomeToRecord = (income: PlannedIncome): Record => {
  return {
    id: income.id,
    recordType: RecordType.PLANNED_INCOME,
    formType: RecordFormType.INCOME,
    date: income.date,
    category: income.category,
    amount: income.amount,
    description: income.description || '',
    createdBy: income.createdBy,
    createdAt: income.createdAt,
    updatedBy: income.updatedBy,
    updatedAt: income.updatedAt,

    allocations: income.allocations,
  };
};

const mapProjectTransactionToRecord = (pt: ProjectTransaction): Record => {
  return {
    id: pt.id,
    recordType: RecordType.PROJECT_TRANSACTION,
    formType: RecordFormType.TRANSFER,
    date: pt.date,
    amount: pt.amount,
    category: pt.category,
    description: pt.description || '',
    createdBy: pt.createdBy,
    createdAt: pt.createdAt,
    updatedBy: pt.updatedBy,
    updatedAt: pt.updatedAt,
    toProjectId: pt.toProjectId,
    fromProjectId: pt.fromProjectId,
    incomeSource: pt.incomeSource,
  };
};

const defaultRecord: Record = {
  formType: RecordFormType.EXPENSE,
  date: new Date(),
  amount: 0,
  description: '',
  category: '',
  projectId: '',
  fromProjectId: '',
  toProjectId: '',
  incomeSource: '',
  allocations: [],
  transactionType: TransactionType.EXPENSE,
};

const converters = {
  [RecordType.TRANSACTION]: mapTransactionToRecord,
  [RecordType.PLANNED_INCOME]: mapPlannedIncomeToRecord,
  [RecordType.PROJECT_TRANSACTION]: mapProjectTransactionToRecord,
};

export const toRecord = (record?: AnyRecord): Record => {
  if (!record) {
    return { ...defaultRecord };
  } else if ('projectId' in record) {
    const converter = converters[RecordType.TRANSACTION];
    return converter(record as Transaction);
  } else if ('allocations' in record) {
    const converter = converters[RecordType.PLANNED_INCOME];
    return converter(record as PlannedIncome);
  } else if ('fromProjectId' in record || 'toProjectId' in record) {
    const converter = converters[RecordType.PROJECT_TRANSACTION];
    return converter(record as ProjectTransaction);
  }

  throw new Error('Invalid record type');
};
