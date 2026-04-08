import {
  CalculationMode,
  RetirementTransitionMode,
  SalaryPercentageRetirementMode,
} from '@/domains/retirement/schemas';
import type {
  RetirementExpenseCategory,
  RetirementIncomeSource,
  RetirementPlan,
  RetirementTransition,
} from '@/domains/retirement/types';

/**
 * Applies the retirement spending multiplier to a working-year amount.
 *
 * IMMEDIATE: Full multiplier applied in the retirement year.
 * GRADUAL: Linear reduction over transitionYears.
 *   Formula per year n (1-indexed from retirement year):
 *     effectiveMultiplier = 1.0 - (n / transitionYears) * (1 - retirementMultiplier)
 *   Capped at retirementMultiplier once n >= transitionYears.
 */
function applyRetirementMultiplier(
  workingAmount: number,
  retirementMultiplier: number,
  year: number,
  retirementYear: number,
  transition: RetirementTransition | undefined,
): number {
  const mode = transition?.mode ?? RetirementTransitionMode.IMMEDIATE;

  if (mode === RetirementTransitionMode.IMMEDIATE) {
    return workingAmount * retirementMultiplier;
  }

  // GRADUAL
  const transitionYears = transition!.transitionYears;
  const yearsIntoRetirement = year - retirementYear + 1; // 1 = retirement year itself

  if (yearsIntoRetirement >= transitionYears) {
    return workingAmount * retirementMultiplier;
  }

  const reductionPerYear = (1 - retirementMultiplier) / transitionYears;
  const effectiveMultiplier = 1.0 - reductionPerYear * yearsIntoRetirement;
  return workingAmount * effectiveMultiplier;
}

function resolveCalculationMode(expense: RetirementExpenseCategory): CalculationMode {
  const declaredMode = expense.calculationMode ?? CalculationMode.FIXED;
  const hasLegacySalaryPercent = (expense.percentOfSalary ?? 0) > 0;
  return declaredMode === CalculationMode.FIXED && hasLegacySalaryPercent
    ? CalculationMode.SALARY_PERCENTAGE
    : declaredMode;
}

function calculateDebtPaymentExpense(
  expense: RetirementExpenseCategory,
  growthFactor: number,
): number {
  const snapshotInterest = expense.calculatedFrom?.interestPaid;
  const sampleCount = expense.calculatedFrom?.sampleCount;

  if (expense.interestOnly && snapshotInterest != null && sampleCount && sampleCount > 0) {
    const annualizedInterest = (snapshotInterest / sampleCount) * 12;
    return annualizedInterest * growthFactor;
  }

  return expense.baseAmount * growthFactor;
}

function projectIncomeAtYear(
  income: RetirementIncomeSource,
  year: number,
  currentYear: number,
): number {
  if (year < income.startYear || year > income.endYear) return 0;
  const yearsGrowth = year - currentYear;
  return income.baseAmount * Math.pow(1 + income.growthRate / 100, yearsGrowth);
}

function resolveRetirementBaselineSalaryAmount(
  expense: RetirementExpenseCategory,
  plan: RetirementPlan,
  retirementYear: number,
): number {
  if (expense.linkedIncomeId) {
    const linkedIncome = plan.incomes.find((income) => income.id === expense.linkedIncomeId);
    if (!linkedIncome) return 0;

    const referenceYear = Math.min(retirementYear, linkedIncome.endYear);
    return projectIncomeAtYear(linkedIncome, referenceYear, plan.currentYear);
  }

  // If not linked to a specific source, use all salary streams and
  // anchor each stream at retirement year or its last active year.
  return plan.incomes
    .filter((income) => income.type === 'salary')
    .reduce((sum, income) => {
      const referenceYear = Math.min(retirementYear, income.endYear);
      return sum + projectIncomeAtYear(income, referenceYear, plan.currentYear);
    }, 0);
}

function calculateSalaryPercentageExpense(
  expense: RetirementExpenseCategory,
  plan: RetirementPlan,
  year: number,
  retirementYear: number,
  isRetired: boolean,
  growthFactor: number,
  yearlyIncomes: Map<string, number>,
  totalSalaryIncome: number,
): number {
  const salaryPercentage = expense.salaryPercentage ?? (expense.percentOfSalary ?? 0) / 100;
  const retirementMode =
    expense.salaryPercentageRetirementMode ?? SalaryPercentageRetirementMode.MANUAL_FALLBACK;

  if (!isRetired) {
    const linkedAmount = expense.linkedIncomeId
      ? (yearlyIncomes.get(expense.linkedIncomeId) ?? 0)
      : totalSalaryIncome;

    if (linkedAmount === 0 && salaryPercentage > 0) {
      const fallback = expense.fallbackAmount ?? expense.baseAmount;
      return fallback * growthFactor;
    }

    return linkedAmount * salaryPercentage;
  }

  const yearsFromRetirement = year - retirementYear;
  const retirementGrowthFactor = Math.pow(1 + expense.growthRate / 100, yearsFromRetirement);

  if (retirementMode === SalaryPercentageRetirementMode.INFLATION_BASED) {
    const baselineSalary = resolveRetirementBaselineSalaryAmount(expense, plan, retirementYear);
    const inferredBase =
      baselineSalary > 0
        ? baselineSalary * salaryPercentage
        : (expense.fallbackAmount ?? expense.baseAmount);
    return inferredBase * retirementGrowthFactor;
  }

  const base = expense.fallbackAmount ?? expense.baseAmount * expense.retirementMultiplier;
  return base * retirementGrowthFactor;
}

/**
 * Calculates the annual expense for a single expense category in a given year.
 */
export function calculateYearlyExpense(
  expense: RetirementExpenseCategory,
  year: number,
  plan: RetirementPlan,
  yearlyIncomes: Map<string, number>,
  totalSalaryIncome: number,
): number {
  const retirementYear = plan.birthYear + plan.retirementAge;
  const isRetired = year >= retirementYear;
  const planEndYear = plan.birthYear + plan.lifeExpectancy;
  const expenseEndYear = expense.endYear ?? planEndYear;

  if (year < expense.startYear || year > expenseEndYear) return 0;

  const mode = resolveCalculationMode(expense);
  const yearsFromStart = year - plan.currentYear;
  const growthFactor = Math.pow(1 + expense.growthRate / 100, yearsFromStart);

  if (expense.type === 'debt_payment') {
    return calculateDebtPaymentExpense(expense, growthFactor);
  }

  if (mode === CalculationMode.SALARY_PERCENTAGE) {
    return calculateSalaryPercentageExpense(
      expense,
      plan,
      year,
      retirementYear,
      isRetired,
      growthFactor,
      yearlyIncomes,
      totalSalaryIncome,
    );
  }

  const inflatedAmount = expense.baseAmount * growthFactor;
  if (!isRetired) return inflatedAmount;

  return applyRetirementMultiplier(
    inflatedAmount,
    expense.retirementMultiplier,
    year,
    retirementYear,
    plan.retirementTransition,
  );
}
