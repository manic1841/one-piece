import type { RetirementIncomeSource } from '@/domains/retirement/types';

/**
 * Calculates the annual income for a given income source in a specific year.
 * Handles three calculation modes:
 * - FIXED: Base amount with growth rate applied
 * - IMPORTED: Base amount with growth rate applied
 * - DERIVED: Calculated from another income with multiplier
 */
export function calculateYearlyIncome(
  income: RetirementIncomeSource,
  yearsFromBase: number = 0,
  derivedIncomes?: Map<string, number>,
): number {
  const mode = income.incomeCalculationMode ?? 'FIXED';

  if (mode === 'DERIVED' && income.derivedFrom) {
    const baseIncomeAmount = derivedIncomes?.get(income.derivedFrom.baseIncomeId) ?? 0;
    return baseIncomeAmount * income.derivedFrom.multiplier;
  }

  // FIXED and IMPORTED modes: apply growth rate
  const growthFactor = Math.pow(1 + income.growthRate / 100, yearsFromBase);
  return income.baseAmount * growthFactor;
}

/**
 * Builds a map of yearly income amounts for all income sources in a given year.
 * Handles dependency ordering to ensure derived incomes are calculated after their bases.
 */
export function calculateYearlyIncomes(
  incomes: RetirementIncomeSource[],
  year: number,
  baseYear: number = new Date().getFullYear(),
): Map<string, number> {
  const result = new Map<string, number>();
  const yearsFromBase = year - baseYear;

  // First pass: calculate non-derived incomes
  for (const income of incomes) {
    if (income.incomeCalculationMode !== 'DERIVED') {
      const amount = calculateYearlyIncome(income, yearsFromBase);
      result.set(income.id, amount);
    }
  }

  // Second pass: calculate derived incomes (now that base incomes are available)
  for (const income of incomes) {
    if (income.incomeCalculationMode === 'DERIVED') {
      const amount = calculateYearlyIncome(income, yearsFromBase, result);
      result.set(income.id, amount);
    }
  }

  return result;
}

/**
 * Calculates total income for a given year across all active income sources.
 */
export function calculateTotalYearlyIncome(
  incomes: RetirementIncomeSource[],
  year: number,
  baseYear: number = new Date().getFullYear(),
): number {
  const yearlyIncomes = calculateYearlyIncomes(incomes, year, baseYear);
  let total = 0;
  for (const amount of yearlyIncomes.values()) {
    total += amount;
  }
  return total;
}

/**
 * Filters active income sources for a given year.
 */
export function filterActiveIncomes(
  incomes: RetirementIncomeSource[],
  year: number,
): RetirementIncomeSource[] {
  return incomes.filter((income) => year >= income.startYear && year <= income.endYear);
}

/**
 * Finds income source by ID (utility for derived income lookups).
 */
export function findIncomeById(
  incomes: RetirementIncomeSource[],
  incomeId: string,
): RetirementIncomeSource | undefined {
  return incomes.find((income) => income.id === incomeId);
}
