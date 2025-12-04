export const FormType = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
} as const;

export type FormType = (typeof FormType)[keyof typeof FormType];
