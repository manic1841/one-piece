export const FormType = {
  income: 'income',
  expense: 'expense',
  transfer: 'transfer',
} as const;

export type FormType = (typeof FormType)[keyof typeof FormType];
