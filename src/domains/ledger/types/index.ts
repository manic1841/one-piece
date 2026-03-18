import { type Transaction } from '@/domains/ledger/schemas';

export type TransactionModel = Transaction;

export interface LedgerBalance {
  accountId: string;
  amount: number;
}
