import { type Transaction } from '@/infra/schemas/ledger';

import { type TransactionModel } from '../types';

export const toTransactionModel = (dto: Transaction): TransactionModel => {
  return { ...dto };
};
