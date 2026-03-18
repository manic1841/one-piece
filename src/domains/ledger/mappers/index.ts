import { type Transaction } from '@/domains/ledger/schemas';

import { type TransactionModel } from '../types';

export const toTransactionModel = (dto: Transaction): TransactionModel => {
  return { ...dto };
};
