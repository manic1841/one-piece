import type { RetirementIncomeSource } from '@/domains/retirement/types';

import { resolveGrowthRate } from './resolveGrowthRate';

/**
 * Calculates the annual income for a given income source in a specific year.
 *
 * Working years (before retirement): the stream compounds from its
 * `currentAnnual` anchored at the sample year, using `resolveGrowthRate`.
 * Retirement years (and any year from the stream's start when it starts at or
 * after retirement): use `retirementAnnual` when set, else the current level
 * continues — the user assumption only kicks in from the retirement year.
 */
export function calculateYearlyIncome(
  income: RetirementIncomeSource,
  year: number,
  retirementYear: number,
  planInflationRate: number,
  sampleYear: number,
): number {
  const usesRetirementAmount = year >= retirementYear || income.startYear >= retirementYear;

  if (usesRetirementAmount && income.retirementAnnual !== undefined) {
    const anchorYear = income.startYear >= retirementYear ? income.startYear : retirementYear;
    const growth = resolveGrowthRate(income.growthRate, planInflationRate);
    const yearsFromAnchor = Math.max(0, year - anchorYear);
    return income.retirementAnnual * Math.pow(1 + growth / 100, yearsFromAnchor);
  }

  const growth = resolveGrowthRate(income.growthRate, planInflationRate);
  const yearsFromSample = Math.max(0, year - sampleYear);
  // null currentAnnual = scenario-only stream: no pre-retirement contribution.
  return (income.currentAnnual ?? 0) * Math.pow(1 + growth / 100, yearsFromSample);
}

/**
 * Builds a map of yearly income amounts for all income sources in a given year.
 */
export function calculateYearlyIncomes(
  incomes: RetirementIncomeSource[],
  year: number,
  retirementYear: number,
  planInflationRate: number,
  sampleYear: number,
): Map<string, number> {
  const result = new Map<string, number>();

  for (const income of incomes) {
    result.set(
      income.id,
      calculateYearlyIncome(income, year, retirementYear, planInflationRate, sampleYear),
    );
  }

  return result;
}

/**
 * Calculates total income for a given year across all active income sources.
 */
export function calculateTotalYearlyIncome(
  incomes: RetirementIncomeSource[],
  year: number,
  retirementYear: number,
  planInflationRate: number,
  sampleYear: number,
): number {
  const yearlyIncomes = calculateYearlyIncomes(
    incomes,
    year,
    retirementYear,
    planInflationRate,
    sampleYear,
  );
  let total = 0;
  for (const amount of yearlyIncomes.values()) {
    total += amount;
  }
  return total;
}

/**
 * Filters active income sources for a given year. Stream start/end years are
 * authoritative since linked year modes were removed (issue #133).
 */
export function filterActiveIncomes(
  incomes: RetirementIncomeSource[],
  year: number,
  projectionEndYear?: number,
): RetirementIncomeSource[] {
  return incomes.filter((income) => {
    const effectiveEndYear = income.lifelong
      ? (projectionEndYear ?? Number.MAX_SAFE_INTEGER)
      : (income.endYear ?? Number.MAX_SAFE_INTEGER);

    return year >= income.startYear && year <= effectiveEndYear;
  });
}
