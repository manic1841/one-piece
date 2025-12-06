import { ProjectDetailType } from '@/domains/project/types';

export const IncomeColor = 'green';
export const ExpenseColor = 'red';
export const TransferIncomeColor = 'blue';
export const TransferExpenseColor = 'orange';

export const ProjectDetailItemColors = {
  [ProjectDetailType.INCOME]: IncomeColor,
  [ProjectDetailType.EXPENSE]: ExpenseColor,
  [ProjectDetailType.TRANSFER_INCOME]: TransferIncomeColor,
  [ProjectDetailType.TRANSFER_EXPENSE]: TransferExpenseColor,
} as const;
