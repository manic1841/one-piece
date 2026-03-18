import { type RetirementPlan } from '@/domains/retirement/types';

export type RetirementProjection = {
  year: number;
  age: number;
  isRetired: boolean;
  income: number;
  expense: number;
  netCashFlow: number;
  savings: number;
  isBankrupt: boolean;
};

const toRate = (value: number) => value / 100;

const growFromCurrentYear = (
  baseAmount: number,
  growthRate: number,
  planYear: number,
  currentYear: number,
) => {
  return baseAmount * Math.pow(1 + toRate(growthRate), planYear - currentYear);
};

export function calculatePlanProjection(plan: RetirementPlan): RetirementProjection[] {
  const projections: RetirementProjection[] = [];
  const startYear = plan.currentYear;
  const endYear = plan.birthYear + plan.lifeExpectancy;
  const retirementYear = plan.birthYear + plan.retirementAge;

  let savings = plan.currentSavings;
  let everBankrupt = savings < 0;

  for (let year = startYear; year <= endYear; year += 1) {
    const age = year - plan.birthYear;
    const isRetired = year >= retirementYear;

    let income = 0;
    let salaryIncome = 0;

    for (const source of plan.incomes) {
      if (year < source.startYear || year > source.endYear) {
        continue;
      }

      const amount = growFromCurrentYear(source.baseAmount, source.growthRate, year, startYear);
      income += amount;

      if (source.type === 'salary') {
        salaryIncome += amount;
      }
    }

    let expense = 0;
    for (const category of plan.expenses) {
      const categoryEndYear = category.endYear ?? endYear;
      if (year < category.startYear || year > categoryEndYear) {
        continue;
      }

      if ((category.percentOfSalary ?? 0) > 0) {
        if (isRetired) {
          const inflatedBase = growFromCurrentYear(
            category.baseAmount,
            category.growthRate,
            year,
            startYear,
          );
          expense += inflatedBase * category.retirementMultiplier;
        } else {
          expense += salaryIncome * ((category.percentOfSalary ?? 0) / 100);
        }
      } else {
        const inflatedBase = growFromCurrentYear(
          category.baseAmount,
          category.growthRate,
          year,
          startYear,
        );
        expense += inflatedBase * (isRetired ? category.retirementMultiplier : 1);
      }
    }

    for (const event of plan.events) {
      if (event.year !== year) {
        continue;
      }
      if (event.type === 'income') {
        income += event.amount;
      } else {
        expense += event.amount;
      }
    }

    const netCashFlow = income - expense;
    savings = savings * (1 + toRate(plan.investmentReturnRate)) + netCashFlow;
    everBankrupt = everBankrupt || savings < 0;

    projections.push({
      year,
      age,
      isRetired,
      income,
      expense,
      netCashFlow,
      savings,
      isBankrupt: everBankrupt,
    });
  }

  return projections;
}
