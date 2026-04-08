import { type RetirementPlan } from '@/domains/retirement/types';

import { calculateRetirementProjection } from './retirementCalculator';

export type RetirementProjection = {
  year: number;
  age: number;
  isRetired: boolean;
  income: number;
  expense: number;
  netCashFlow: number;
  investmentIncome: number;
  incomeBreakdown: Array<{ name: string; amount: number }>;
  expenseBreakdown: Array<{ name: string; amount: number }>;
  savings: number;
  isBankrupt: boolean;
};

export function calculatePlanProjection(plan: RetirementPlan): RetirementProjection[] {
  const fullProjection = calculateRetirementProjection(plan);
  let everBankrupt = plan.currentSavings < 0;

  return fullProjection.map((p) => {
    everBankrupt = everBankrupt || p.closingBalance < 0;
    return {
      year: p.year,
      age: p.age,
      isRetired: p.isRetired,
      income: p.totalIncome + p.oneTimeIncome,
      expense: p.totalExpense + p.oneTimeExpense,
      netCashFlow: p.netCashFlow,
      investmentIncome: p.investmentIncome,
      incomeBreakdown: p.incomeBreakdown,
      expenseBreakdown: p.expenseBreakdown,
      savings: p.closingBalance,
      isBankrupt: everBankrupt,
    };
  });
}
