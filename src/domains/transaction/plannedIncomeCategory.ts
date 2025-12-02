// Planned Income Category
export const PlannedIncomeCategory = {
  SALARY: 'salary',
  BONUS: 'bonus',
  OTHER: 'other',
} as const;

export type PlannedIncomeCategory =
  (typeof PlannedIncomeCategory)[keyof typeof PlannedIncomeCategory];
