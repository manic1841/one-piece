import type { RetirementExpenseCategory, RetirementPlan } from '@/domains/retirement/types';

import { resolveGrowthRate } from './resolveGrowthRate';

/**
 * Post-retirement level: currentAnnual compounded to the retirement year
 * (issue #127 explicit semantic), times the retirement multiplier, applied
 * immediately in the retirement year (GRADUAL removed).
 */
export function calculateYearlyExpense(
  expense: RetirementExpenseCategory,
  year: number,
  plan: RetirementPlan,
  sampleYear: number,
): number {
  const retirementYear = plan.birthYear + plan.retirementAge;
  const planEndYear = plan.birthYear + plan.lifeExpectancy;
  const expenseEndYear = expense.endYear ?? planEndYear;

  if (year < expense.startYear || year > expenseEndYear) return 0;

  const growth = resolveGrowthRate(expense.growthRate, plan.inflationRate);
  const currentLevel = expense.currentAnnual * Math.pow(1 + growth / 100, year - sampleYear);

  if (expense.type === 'debt_payment') {
    return calculateDebtPaymentExpense(expense, currentLevel);
  }

  if (year < retirementYear) return currentLevel;

  return currentLevel * expense.retirementMultiplier;
}

function calculateDebtPaymentExpense(
  expense: RetirementExpenseCategory,
  currentLevel: number,
): number {
  const snapshotInterest = expense.calculatedFrom?.interestPaid;
  const sampleCount = expense.calculatedFrom?.sampleCount;

  if (expense.interestOnly && snapshotInterest != null && sampleCount && sampleCount > 0) {
    return (snapshotInterest / sampleCount) * 12;
  }

  return currentLevel;
}

