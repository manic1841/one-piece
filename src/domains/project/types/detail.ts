import { type Transaction } from '@/domains/ledger/schemas';
import { type ProjectSnapshot } from '@/domains/project/schemas';

export const ProjectDetailType = {
  RECORD: 'record',
  SNAPSHOT: 'snapshot',
} as const;

export type ProjectDetailType = (typeof ProjectDetailType)[keyof typeof ProjectDetailType];

export interface ProjectDetailData {
  id: string;
  type: ProjectDetailType;
  date: Date;
  title: string;
  amount: number;
  description?: string;
  category: string;
  data: Transaction | ProjectSnapshot;
  isNegative?: boolean; // For display purposes
}

export function toDetailItem(transaction: Transaction): ProjectDetailData {
  const amount = transaction.amount || 0;
  return {
    id: transaction.id,
    type: ProjectDetailType.RECORD,
    date:
      transaction.date instanceof Date
        ? transaction.date
        : new Date(((transaction.date as unknown) as { seconds: number }).seconds * 1000),
    title: transaction.description || 'Transaction',
    amount: Math.abs(amount),
    isNegative: amount < 0,
    description: transaction.description,
    category: transaction.intent || '',
    data: transaction,
  };
}

export function toSnapshotDetailItem(snapshot: ProjectSnapshot): ProjectDetailData {
  return {
    id: snapshot.id,
    type: ProjectDetailType.SNAPSHOT,
    date: new Date(snapshot.year, snapshot.month - 1, 1),
    title: `Settlement: ${snapshot.year}-${snapshot.month.toString().padStart(2, '0')}`,
    amount: snapshot.closingBalance,
    isNegative: snapshot.closingBalance < 0,
    description: `Balance: ${snapshot.closingBalance}`,
    category: 'Settlement',
    data: snapshot,
  };
}
