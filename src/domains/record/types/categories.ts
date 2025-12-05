// Transaction Category Types
export const TransactionCategory = {
  // expense
  FOOD: 'food',
  TRANSPORTATION: 'transportation',
  HOUSING: 'housing',
  UTILITIES: 'utilities',
  ENTERTAINMENT: 'entertainment',
  HEALTHCARE: 'healthcare',
  EDUCATION: 'education',
  SHOPPING: 'shopping',
  // income
  SALARY: 'salary',
  BONUS: 'bonus',
  // other
  OTHER: 'other',
};
export type TransactionCategory = (typeof TransactionCategory)[keyof typeof TransactionCategory];

// Planned Income Category
export const PlannedIncomeCategory = {
  SALARY: 'salary',
  BONUS: 'bonus',
  OTHER: 'other',
} as const;

export type PlannedIncomeCategory =
  (typeof PlannedIncomeCategory)[keyof typeof PlannedIncomeCategory];

// ProjectTransactionType Schema
export const ProjectTransactionCategory = {
  ALLOCATION: 'allocation',
  TRANSFER: 'transfer',
  ADJUSTMENT: 'adjustment',
} as const;

export type ProjectTransactionCategory =
  (typeof ProjectTransactionCategory)[keyof typeof ProjectTransactionCategory];

// Record Category Type
export type RecordCategory =
  | TransactionCategory
  | PlannedIncomeCategory
  | ProjectTransactionCategory;
