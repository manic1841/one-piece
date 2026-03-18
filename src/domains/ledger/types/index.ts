import { type Transaction } from '@/infra/schemas/ledger';

export type TransactionModel = Transaction;

export interface LedgerBalance {
  accountId: string;
  amount: number;
}
