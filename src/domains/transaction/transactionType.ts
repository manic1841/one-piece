// Transaction Type
export const TransactionType = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];
