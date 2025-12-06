import {
  PlannedIncomeCategory,
  ProjectTransactionCategory,
  TransactionCategory,
} from '@/domains/record/types';

export const ExpenseCategoryLabel = {
  [TransactionCategory.FOOD]: 'Food & Dining',
  [TransactionCategory.TRANSPORTATION]: 'Transportation',
  [TransactionCategory.HOUSING]: 'Housing',
  [TransactionCategory.UTILITIES]: 'Utilities',
  [TransactionCategory.ENTERTAINMENT]: 'Entertainment',
  [TransactionCategory.HEALTHCARE]: 'Healthcare',
  [TransactionCategory.EDUCATION]: 'Education',
  [TransactionCategory.SHOPPING]: 'Shopping',
  [TransactionCategory.OTHER]: 'Other',
} as const;

export const ExpenseCategoryOptions = Object.entries(ExpenseCategoryLabel).map(([key, value]) => ({
  value: key,
  label: value,
}));

export const IncomeCategoryLabel = {
  [TransactionCategory.SALARY]: 'Salary',
  [TransactionCategory.BONUS]: 'Bonus',
  [TransactionCategory.OTHER]: 'Other',
} as const;

export const IncomeCategoryOptions = Object.entries(IncomeCategoryLabel).map(([key, value]) => ({
  value: key,
  label: value,
}));

export const PlannedIncomeCategoryLabel = {
  [PlannedIncomeCategory.SALARY]: 'Salary',
  [PlannedIncomeCategory.BONUS]: 'Bonus',
  [PlannedIncomeCategory.OTHER]: 'Other',
} as const;

export const PlannedIncomeCategoryOptions = Object.entries(PlannedIncomeCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

export const TransferCategoryLabel = {
  [ProjectTransactionCategory.ALLOCATION]: 'Allocation',
  [ProjectTransactionCategory.TRANSFER]: 'Transfer',
  [ProjectTransactionCategory.ADJUSTMENT]: 'Adjustment',
} as const;

export const TransferCategoryOptions = Object.entries(TransferCategoryLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

export const RecordCategoryLabels = {
  income: IncomeCategoryLabel,
  expense: ExpenseCategoryLabel,
  planned: PlannedIncomeCategoryLabel,
  transfer: TransferCategoryLabel,
} as const;

export const RecordCategoryOptions = {
  income: IncomeCategoryOptions,
  expense: ExpenseCategoryOptions,
  planned: PlannedIncomeCategoryOptions,
  transfer: TransferCategoryOptions,
};
