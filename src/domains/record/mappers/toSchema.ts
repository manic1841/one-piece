import type {
  AnyRecord,
  Record,
  Transaction,
  PlannedIncome,
  ProjectTransaction,
} from '@/domains/record/types';
import { RecordType } from '@/domains/record/types';

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

const converters = {
  [RecordType.TRANSACTION]: transactionConverter,
  [RecordType.PLANNED_INCOME]: plannedIncomeConverter,
  [RecordType.PROJECT_TRANSACTION]: projectTransactionConverter,
} as const;

export const toSchema = (record: Record, type: RecordType): AnyRecord => {
  const converter = converters[type];
  if (!converter) throw new Error(`No converter for ${type}`);
  return converter(record);
};
