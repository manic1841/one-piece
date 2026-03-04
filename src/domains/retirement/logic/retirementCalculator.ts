import type { RetirementPlan, RetirementProjectionYear } from '@/domains/retirement/types';

/**
 * Calculates the future value of an amount based on a growth rate and number of years.
 */
const calculateFutureValue = (presentValue: number, rate: number, years: number): number => {
  return presentValue * Math.pow(1 + rate / 100, years);
};

/**
 * Calculates the retirement projection for a given plan.
 */
export const calculateRetirementProjection = (plan: RetirementPlan): RetirementProjectionYear[] => {
  const projection: RetirementProjectionYear[] = [];
  let currentSavings = plan.currentSavings;
  const startYear = plan.currentYear;
  const endYear = startYear + (plan.lifeExpectancy - plan.currentAge);

  for (let year = startYear; year <= endYear; year++) {
    const age = plan.currentAge + (year - startYear);
    const isRetired = age >= plan.retirementAge;

    // 1. Calculate Income
    let totalIncome = 0;
    let totalSalary = 0; // Track total salary for ratio-based expenses
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
    plan.expenses.forEach((expense) => {
      const expenseEndYear = expense.endYear ?? endYear;
      if (year >= expense.startYear && year <= expenseEndYear) {
        const yearsGrowth = year - expense.startYear;
        // Calculate growth-based amount
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

    // 4. Investment Income (on opening balance)
    const investmentIncome = currentSavings * (plan.investmentReturnRate / 100);

    // 5. Net Cash Flow (excluding investment income for cash flow, but included in balance)
    // Note: Usually investment income is reinvested or part of the balance growth.
    // Here we treat it as adding to the balance.
    const netCashFlow = totalIncome - totalExpense;

    // 6. Closing Balance
    const openingBalance = currentSavings;
    const closingBalance =
      openingBalance + netCashFlow + investmentIncome + oneTimeIncome - oneTimeExpense;

    projection.push({
      year,
      age,
      isRetired,
      totalIncome,
      totalExpense,
      netCashFlow,
      openingBalance,
      investmentIncome,
      oneTimeIncome,
      oneTimeExpense,
      closingBalance,
      events: yearEvents,
    });

    // Update savings for next year
    currentSavings = closingBalance;
  }

  return projection;
};

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
    retirementYear: plan.currentYear + (plan.retirementAge - plan.currentAge),
    savingsAtRetirement: retirementProjection ? retirementProjection.openingBalance : 0,
    minSavings,
    minSavingsYear,
    isBankrupt,
  };
};
