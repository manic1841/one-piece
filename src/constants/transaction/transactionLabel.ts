export const TRANSACTION_CATEGORIES = {
  income: [
    { value: 'salary', label: 'Salary' },
    { value: 'bonus', label: 'Bonus' },
    { value: 'other', label: 'Other' },
  ],
  expense: [
    { value: 'food', label: 'Food & Dining' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'housing', label: 'Housing' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'other', label: 'Other Expense' },
  ],
} as const;

export type IncomeCategoryType = (typeof TRANSACTION_CATEGORIES.income)[number]['value'];
export type ExpenseCategoryType = (typeof TRANSACTION_CATEGORIES.expense)[number]['value'];

// Transaction Type
export const TRANSACTION_FORM_TYPES = {
  income: 'income',
  expense: 'expense',
  transfer: 'transfer',
} as const;

export type TransactionFormType =
  (typeof TRANSACTION_FORM_TYPES)[keyof typeof TRANSACTION_FORM_TYPES];
