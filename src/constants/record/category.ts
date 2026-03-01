import {
  PlannedIncomeCategory,
  ProjectTransactionCategory,
  TransactionCategory,
} from '@/domains/record/types';

export const ExpenseCategoryLabel = {
  [TransactionCategory.FOOD]: '飲食',
  [TransactionCategory.TRANSPORTATION]: '交通',
  [TransactionCategory.HOUSING]: '家居',
  [TransactionCategory.UTILITIES]: '生活',
  [TransactionCategory.ENTERTAINMENT]: '娛樂',
  [TransactionCategory.HEALTHCARE]: '醫療',
  [TransactionCategory.EDUCATION]: '教育',
  [TransactionCategory.SHOPPING]: '購物',
  [TransactionCategory.OTHER]: '其他',
} as const;

export const ExpenseCategoryOptions = Object.entries(ExpenseCategoryLabel).map(([key, value]) => ({
  value: key,
  label: value,
}));

export const IncomeCategoryLabel = {
  [TransactionCategory.SALARY]: '薪水',
  [TransactionCategory.BONUS]: '獎金',
  [TransactionCategory.OTHER]: '其他',
} as const;

export const IncomeCategoryOptions = Object.entries(IncomeCategoryLabel).map(([key, value]) => ({
  value: key,
  label: value,
}));

export const PlannedIncomeCategoryLabel = {
  [PlannedIncomeCategory.SALARY]: '薪水',
  [PlannedIncomeCategory.BONUS]: '獎金',
  [PlannedIncomeCategory.OTHER]: '其他',
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
