import type { RetirementPlan, RetirementProjectionYear } from '@/domains/retirement/types';

import { calculateYearlyExpense } from './expenseEngine';
import {
  calculateRetirementEventPhaseAmount,
  normalizeRetirementEventPhases,
} from './retirementEventPhases';
import { calculateYearlyIncomes } from './retirementIncomeCalculator';

export interface YearlyProjection {
  year: number;
  projectedAssets: number;
  projectedIncome: number;
  projectedExpense: number;
}

interface YearlyFlowDetails {
  totalIncome: number;
  totalExpense: number;
  oneTimeIncome: number;
  oneTimeExpense: number;
  incomeBreakdown: Array<{ name: string; amount: number }>;
  expenseBreakdown: Array<{ name: string; amount: number }>;
  yearEvents: string[];
  isRetired: boolean;
}

function resolveIncomeWindow(
  income: RetirementPlan['incomes'][number],
  projectionEndYear: number,
): { effectiveStartYear: number; effectiveEndYear: number } {
  // Migration (#132) already resolved LINKED_TO_RETIREMENT year modes into
  // concrete years; the stream's start/end years are authoritative now.
  const effectiveStartYear = income.startYear;

  const effectiveEndYear = income.lifelong
    ? projectionEndYear
    : (income.endYear ?? effectiveStartYear);

  return {
    effectiveStartYear,
    effectiveEndYear,
  };
}

export function resolveSampleYear(plan: RetirementPlan): number {
  const sampleYears = plan.incomes
    .map((income) => income.calculatedFrom?.sampleYear)
    .filter((year): year is number => typeof year === 'number');
  return sampleYears.length > 0 ? Math.max(...sampleYears) : plan.currentYear;
}

/**
 * Shared logic for calculating financial flows for a specific year.
 */
function calculateYearlyFlowDetails(plan: RetirementPlan, year: number): YearlyFlowDetails {
  const age = year - plan.birthYear;
  const retirementYear = plan.birthYear + plan.retirementAge;
  const isRetired = age >= plan.retirementAge;
  const incomeBreakdown: Array<{ name: string; amount: number }> = [];
  const expenseBreakdown: Array<{ name: string; amount: number }> = [];

  const currentAge = plan.currentYear - plan.birthYear;
  const projectionEndYear = plan.currentYear + (plan.lifeExpectancy - currentAge);
  const sampleYear = resolveSampleYear(plan);
  const activeIncomes = plan.incomes.filter((income) => {
    const { effectiveStartYear, effectiveEndYear } = resolveIncomeWindow(income, projectionEndYear);
    return year >= effectiveStartYear && year <= effectiveEndYear;
  });

  const yearlyIncomeMap = calculateYearlyIncomes(
    activeIncomes,
    year,
    retirementYear,
    plan.inflationRate,
    sampleYear,
  );
  let totalIncome = 0;
  activeIncomes.forEach((income) => {
    const amount = yearlyIncomeMap.get(income.id) ?? 0;
    if (amount <= 0) {
      return;
    }

    totalIncome += amount;
    incomeBreakdown.push({ name: income.name, amount });
  });

  // 2. Calculate Expenses
  let totalExpense = 0;
  plan.expenses.forEach((expense) => {
    const amount = calculateYearlyExpense(expense, year, plan, sampleYear);
    totalExpense += amount;
    if (amount > 0) {
      expenseBreakdown.push({ name: expense.name, amount });
    }
  });

  // 3. One-Time Events
  let oneTimeIncome = 0;
  let oneTimeExpense = 0;
  const yearEvents: string[] = [];

  plan.events.forEach((event) => {
    const phases = normalizeRetirementEventPhases(event);
    let hasEventInYear = false;
    let eventYearAmount = 0;
    phases.forEach((phase) => {
      const phaseAmount = calculateRetirementEventPhaseAmount(phase, year, plan.inflationRate);

      if (phaseAmount <= 0) {
        return;
      }

      eventYearAmount += phaseAmount;

      if (event.type === 'income') {
        oneTimeIncome += phaseAmount;
      } else {
        oneTimeExpense += phaseAmount;
      }
      hasEventInYear = true;
    });

    if (hasEventInYear) {
      yearEvents.push(event.name);
      if (event.type === 'income') {
        incomeBreakdown.push({ name: `Event: ${event.name}`, amount: eventYearAmount });
      } else {
        expenseBreakdown.push({ name: `Event: ${event.name}`, amount: eventYearAmount });
      }
    }
  });

  return {
    totalIncome,
    totalExpense,
    oneTimeIncome,
    oneTimeExpense,
    incomeBreakdown,
    expenseBreakdown,
    yearEvents,
    isRetired,
  };
}

/**
 * Calculates the retirement projection for a given plan. The starting balance
 * is injected by the caller (latest closed period's net worth, issue #127 Q1)
 * — the plan does not store it.
 */
export const calculateRetirementProjection = (
  plan: RetirementPlan,
  startingNetWorth: number,
): RetirementProjectionYear[] => {
  const projection: RetirementProjectionYear[] = [];
  let balance = startingNetWorth;
  const startYear = plan.currentYear;
  const currentAge = startYear - plan.birthYear;
  const endYear = startYear + (plan.lifeExpectancy - currentAge);

  for (let year = startYear; year <= endYear; year++) {
    const age = year - plan.birthYear;
    const flows = calculateYearlyFlowDetails(plan, year);

    // 4. Investment Income (on opening balance)
    const investmentIncome = balance * (plan.investmentReturnRate / 100);

    // 5. Net Cash Flow
    const netCashFlow = flows.totalIncome - flows.totalExpense;

    // 6. Closing Balance
    const openingBalance = balance;
    const closingBalance =
      openingBalance + netCashFlow + investmentIncome + flows.oneTimeIncome - flows.oneTimeExpense;

    projection.push({
      year,
      age,
      isRetired: flows.isRetired,
      totalIncome: flows.totalIncome,
      totalExpense: flows.totalExpense,
      netCashFlow,
      openingBalance,
      investmentIncome,
      oneTimeIncome: flows.oneTimeIncome,
      oneTimeExpense: flows.oneTimeExpense,
      incomeBreakdown: flows.incomeBreakdown,
      expenseBreakdown: flows.expenseBreakdown,
      closingBalance,
      events: flows.yearEvents,
    });

    // Update balance for next year
    balance = closingBalance;
  }

  return projection;
};

/**
 * Calculates a summary projection for a specific target year.
 */
export function getYearlyProjection(
  plan: RetirementPlan,
  targetYear: number,
  startingNetWorth: number,
): YearlyProjection {
  if (targetYear < plan.currentYear) {
    return {
      year: targetYear,
      projectedAssets: 0,
      projectedIncome: 0,
      projectedExpense: 0,
    };
  }

  let balance = startingNetWorth;
  let finalIncome = 0;
  let finalExpense = 0;

  for (let year = plan.currentYear; year <= targetYear; year++) {
    const flows = calculateYearlyFlowDetails(plan, year);
    const investmentIncome = balance * (plan.investmentReturnRate / 100);
    const netCashFlow = flows.totalIncome - flows.totalExpense;

    balance = balance + netCashFlow + investmentIncome + flows.oneTimeIncome - flows.oneTimeExpense;

    if (year === targetYear) {
      finalIncome = flows.totalIncome;
      finalExpense = flows.totalExpense;
    }
  }

  return {
    year: targetYear,
    projectedAssets: balance,
    projectedIncome: finalIncome,
    projectedExpense: finalExpense,
  };
}

/**
 * Calculates summary statistics from a projection.
 */
export const calculateProjectionSummary = (
  projection: RetirementProjectionYear[],
  plan: RetirementPlan,
  startingNetWorth: number,
  anchorYearMonth: string,
) => {
  const retirementYearIndex = projection.findIndex((p) => p.isRetired);
  const retirementProjection = retirementYearIndex >= 0 ? projection[retirementYearIndex] : null;

  let minSavings = Infinity;
  let minSavingsYear = 0;
  let isBankrupt = false;

  projection.forEach((p) => {
    if (p.closingBalance < minSavings) {
      minSavings = p.closingBalance;
      minSavingsYear = p.year;
    }
    if (p.closingBalance < 0) {
      isBankrupt = true;
    }
  });

  return {
    retirementYear: plan.birthYear + plan.retirementAge,
    startingNetWorth,
    anchorYearMonth,
    netWorthAtRetirement: retirementProjection ? retirementProjection.openingBalance : 0,
    finalNetWorth: projection.length > 0 ? projection[projection.length - 1].closingBalance : 0,
    minSavings,
    minSavingsYear,
    isBankrupt,
  };
};
