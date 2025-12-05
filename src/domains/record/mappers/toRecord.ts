import type {
  AnyRecord,
  Record,
  Transaction,
  PlannedIncome,
  ProjectTransaction,
} from '@/domains/record/types';
import { RecordType, RecordFormType, TransactionType } from '@/domains/record/types';

export const toRecord = (record?: AnyRecord): Record => {
  console.log('record', record);
  if (!record) {
    console.log('no record');
    return {
      formType: RecordFormType.EXPENSE,
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
      recordType: RecordType.TRANSACTION,
      formType:
        txn.type === TransactionType.INCOME ? RecordFormType.INCOME : RecordFormType.EXPENSE,
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
      formType: RecordFormType.INCOME,
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
      formType: RecordFormType.TRANSFER,
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
