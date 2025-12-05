export const RecordFilterType = {
  ALL: 'all',
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
};

export type RecordFilterType = (typeof RecordFilterType)[keyof typeof RecordFilterType];
