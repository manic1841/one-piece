import type { RetirementPlan, RetirementProjectionYear } from '@/domains/retirement/types';

/**
 * Calculates the future value of an amount based on a growth rate and number of years.
 */
const calculateFutureValue = (presentValue: number, rate: number, years: number): number => {
  return presentValue * Math.pow(1 + rate / 100, years);
};

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
  yearEvents: string[];
  isRetired: boolean;
}

/**
 * Shared logic for calculating financial flows for a specific year.
 */
function calculateYearlyFlowDetails(plan: RetirementPlan, year: number): YearlyFlowDetails {
  const age = year - plan.birthYear;
  const isRetired = age >= plan.retirementAge;

  // 1. Calculate Income
  let totalIncome = 0;
  let totalSalary = 0;
  plan.incomes.forEach((income) => {
    if (year >= income.startYear && year <= income.endYear) {
      const yearsGrowth = year - income.startYear;
      const amount = calculateFutureValue(income.baseAmount, income.growthRate, yearsGrowth);
      totalIncome += amount;

      if (income.type === 'salary') {
        totalSalary += amount;
      }
    }
  });

  // 2. Calculate Expenses
  let totalExpense = 0;
  const planEndYear =
    plan.currentYear + (plan.lifeExpectancy - (plan.currentYear - plan.birthYear));
  plan.expenses.forEach((expense) => {
    const expenseEndYear = expense.endYear ?? planEndYear;
    if (year >= expense.startYear && year <= expenseEndYear) {
      const yearsGrowth = year - expense.startYear;
      const growthAmount = calculateFutureValue(
        expense.baseAmount,
        expense.growthRate,
        yearsGrowth,
      );

      // Calculate salary-ratio-based amount (if applicable)
      let amount = growthAmount;
      if (expense.percentOfSalary && expense.percentOfSalary > 0) {
        const salaryAmount = totalSalary * (expense.percentOfSalary / 100);
        amount = Math.max(growthAmount, salaryAmount);
      }

      if (isRetired) {
        amount *= expense.retirementMultiplier;
      }

      totalExpense += amount;
    }
  });

  // 3. One-Time Events
  let oneTimeIncome = 0;
  let oneTimeExpense = 0;
  const yearEvents: string[] = [];

  plan.events.forEach((event) => {
    if (event.year === year) {
      if (event.type === 'income') {
        oneTimeIncome += event.amount;
      } else {
        oneTimeExpense += event.amount;
      }
      yearEvents.push(event.name);
    }
  });

  return {
    totalIncome,
    totalExpense,
    oneTimeIncome,
    oneTimeExpense,
    yearEvents,
    isRetired,
  };
}

/**
 * Calculates the retirement projection for a given plan.
 */
export const calculateRetirementProjection = (plan: RetirementPlan): RetirementProjectionYear[] => {
  const projection: RetirementProjectionYear[] = [];
  let currentSavings = plan.currentSavings;
  const startYear = plan.currentYear;
  const currentAge = startYear - plan.birthYear;
  const endYear = startYear + (plan.lifeExpectancy - currentAge);

  for (let year = startYear; year <= endYear; year++) {
    const age = year - plan.birthYear;
    const flows = calculateYearlyFlowDetails(plan, year);

    // 4. Investment Income (on opening balance)
    const investmentIncome = currentSavings * (plan.investmentReturnRate / 100);

    // 5. Net Cash Flow
    const netCashFlow = flows.totalIncome - flows.totalExpense;

    // 6. Closing Balance
    const openingBalance = currentSavings;
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
      closingBalance,
      events: flows.yearEvents,
    });

    // Update savings for next year
    currentSavings = closingBalance;
  }

  return projection;
};

/**
 * Calculates a summary projection for a specific target year.
 */
export function getYearlyProjection(plan: RetirementPlan, targetYear: number): YearlyProjection {
  if (targetYear < plan.currentYear) {
    return {
      year: targetYear,
      projectedAssets: 0,
      projectedIncome: 0,
      projectedExpense: 0,
    };
  }

  let currentSavings = plan.currentSavings;
  let finalIncome = 0;
  let finalExpense = 0;

  for (let year = plan.currentYear; year <= targetYear; year++) {
    const flows = calculateYearlyFlowDetails(plan, year);
    const investmentIncome = currentSavings * (plan.investmentReturnRate / 100);
    const netCashFlow = flows.totalIncome - flows.totalExpense;

    currentSavings =
      currentSavings + netCashFlow + investmentIncome + flows.oneTimeIncome - flows.oneTimeExpense;

    if (year === targetYear) {
      finalIncome = flows.totalIncome;
      finalExpense = flows.totalExpense;
    }
  }

  return {
    year: targetYear,
    projectedAssets: currentSavings,
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
    savingsAtRetirement: retirementProjection ? retirementProjection.openingBalance : 0,
    minSavings,
    minSavingsYear,
    isBankrupt,
  };
};
