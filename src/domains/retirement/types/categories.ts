export const RetirementIncomeType = {
  SALARY: 'salary',
  BONUS: 'bonus',
  PENSION: 'pension',
  RENT: 'rent',
  OTHER: 'other',
} as const;

export type RetirementIncomeType = (typeof RetirementIncomeType)[keyof typeof RetirementIncomeType];

export const RetirementIncomeImportSource = {
  MANUAL: 'manual',
  PLANNED_INCOME: 'plannedIncome',
} as const;

export type RetirementIncomeImportSource =
  (typeof RetirementIncomeImportSource)[keyof typeof RetirementIncomeImportSource];
