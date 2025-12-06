import type {
  AnyRecord,
  PlannedIncome,
  ProjectTransaction,
  Record,
  Transaction,
} from '@/domains/record/types';
import { RecordType } from '@/domains/record/types';

// convert record to schema
export const transactionConverter = (record: Record) => {
  return {
    id: record.id,
    type: record.transactionType,
    date: record.date,
    category: record.category,
    amount: record.amount,
    description: record.description,
    projectId: record.projectId,
    createdAt: record.createdAt,
    createdBy: record.createdBy,
    updatedAt: record.createdAt,
    updatedBy: record.createdBy,
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
    createdAt: record.createdAt,
    createdBy: record.createdBy,
    updatedAt: record.createdAt,
    updatedBy: record.createdBy,
  } as PlannedIncome;
};

export const projectTransactionConverter = (record: Record) => {
  return {
    id: record.id,
    fromProjectId: record.fromProjectId,
    toProjectId: record.toProjectId,
    amount: Number(record.amount),
    date: new Date(record.date),
    category: record.category,
    description: record.description,
    incomeSource: record.incomeSource,
    createdAt: record.createdAt,
    createdBy: record.createdBy,
    updatedAt: record.createdAt,
    updatedBy: record.createdBy,
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
