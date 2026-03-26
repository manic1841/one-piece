import { calculatePlanProjection } from '@/domains/retirement/logic/retirementPlanProjection';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
  type RetirementPlan,
} from '@/domains/retirement/types';
import { formatCurrency } from '@/ui/utils';

export interface RetirementPlanListItemVM {
  id: string;
  name: string;
  isActive: boolean;
  retireYear: number;
  returnRateText: string;
  bankruptcyText: string;
  projectedSavingsText?: string;
}

export interface RetirementPlanHeaderVM {
  id: string;
  name: string;
  retirementSummaryText: string;
  autoUpdate: boolean;
}

export interface RetirementAssumptionsDisplayVM {
  currentYear: number;
  birthYear: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentSavings: number;
  currentSavingsText: string;
  salaryGrowthRate: number;
  inflationRate: number;
  investmentReturnRate: number;
}

export const mapRetirementPlanToHeaderVM = (plan: RetirementPlan): RetirementPlanHeaderVM => ({
  id: plan.id,
  name: plan.name,
  retirementSummaryText: `Retire at ${plan.retirementAge}, life expectancy ${plan.lifeExpectancy}`,
  autoUpdate: plan.autoUpdate,
});

export const mapRetirementPlanToAssumptionsDisplayVM = (
  plan: RetirementPlan,
): RetirementAssumptionsDisplayVM => ({
  currentYear: plan.currentYear,
  birthYear: plan.birthYear,
  retirementAge: plan.retirementAge,
  lifeExpectancy: plan.lifeExpectancy,
  currentSavings: plan.currentSavings,
  currentSavingsText: formatCurrency(plan.currentSavings),
  salaryGrowthRate: plan.salaryGrowthRate,
  inflationRate: plan.inflationRate,
  investmentReturnRate: plan.investmentReturnRate,
});

export const mapRetirementPlanToListItemVM = (plan: RetirementPlan): RetirementPlanListItemVM => ({
  id: plan.id,
  name: plan.name,
  isActive: plan.isActive,
  retireYear: plan.birthYear + plan.retirementAge,
  returnRateText: `${plan.investmentReturnRate}% Return`,
  bankruptcyText: plan.summary?.isBankrupt ? 'Bankrupt Risk' : 'No Bankruptcy',
  projectedSavingsText: plan.summary ? formatCurrency(plan.summary.savingsAtRetirement) : undefined,
});

export interface RetirementIncomeItemVM {
  id: string;
  name: string;
  amountText: string;
  growthText: string;
  periodText: string;
}

export const mapRetirementIncomeToVM = (
  income: RetirementIncomeSource,
): RetirementIncomeItemVM => ({
  id: income.id,
  name: income.name,
  amountText: `${formatCurrency(income.baseAmount)}/yr`,
  growthText: `${income.growthRate}% growth`,
  periodText: `${income.startYear}- ${income.endYear}`,
});

export interface RetirementExpenseItemVM {
  id: string;
  name: string;
  amountText: string;
  growthAndMultiplierText: string;
  periodText: string;
}

export const mapRetirementExpenseToVM = (
  expense: RetirementExpenseCategory,
): RetirementExpenseItemVM => ({
  id: expense.id,
  name: expense.name,
  amountText: `${formatCurrency(expense.baseAmount)}/yr`,
  growthAndMultiplierText: `${expense.growthRate}% growth ${expense.retirementMultiplier * 100}% after retirement`,
  periodText: `${expense.startYear} - ${expense.endYear ?? 'Lifetime'}`,
});

export interface RetirementEventItemVM {
  id: string;
  name: string;
  note?: string;
  yearText: string;
  amountText: string;
  typeText: string;
  amountClassName: string;
}

export const mapRetirementEventToVM = (event: RetirementOneTimeEvent): RetirementEventItemVM => {
  const isIncome = event.type === 'income';
  return {
    id: event.id,
    name: event.name,
    note: event.note,
    yearText: `Year: ${event.year}`,
    amountText: `${isIncome ? '+' : '-'}${formatCurrency(event.amount)}`,
    typeText: event.type,
    amountClassName: isIncome ? 'text-green-600' : 'text-red-500',
  };
};

export interface RetirementProjectionPointVM {
  year: number;
  savings: number;
  savingsText: string;
  isBankruptYear: boolean;
}

export interface RetirementProjectionVM {
  retirementYear: number;
  retirementSavingsText: string;
  minYearText: string;
  minSavingsText: string;
  bankruptText: string;
  bankruptClassName: string;
  chartData: RetirementProjectionPointVM[];
}

export const mapRetirementProjectionToVM = (plan: RetirementPlan): RetirementProjectionVM => {
  const projection = calculatePlanProjection(plan);
  const retirementYear = plan.birthYear + plan.retirementAge;
  const retirementSnapshot = projection.find((item) => item.year === retirementYear);
  const bankruptSnapshot = projection.find((item) => item.savings < 0);

  let minSnapshot = projection[0];
  for (const snapshot of projection) {
    if (!minSnapshot || snapshot.savings < minSnapshot.savings) {
      minSnapshot = snapshot;
    }
  }

  return {
    retirementYear,
    retirementSavingsText: formatCurrency(retirementSnapshot?.savings ?? 0),
    minYearText: String(minSnapshot?.year ?? '-'),
    minSavingsText: formatCurrency(minSnapshot?.savings ?? 0),
    bankruptText: bankruptSnapshot ? `是 (${bankruptSnapshot.year})` : '否',
    bankruptClassName: bankruptSnapshot ? 'text-red-600' : 'text-green-600',
    chartData: projection.map((item) => ({
      year: item.year,
      savings: item.savings,
      savingsText: formatCurrency(item.savings),
      isBankruptYear: bankruptSnapshot?.year === item.year,
    })),
  };
};
