import { calculateYearlyExpense } from '@/domains/retirement/logic/expenseEngine';
import { normalizeRetirementEventPhases } from '@/domains/retirement/logic/retirementEventPhases';
import { type RetirementProjection } from '@/domains/retirement/logic/retirementPlanProjection';
import { resolveSampleYear } from '@/domains/retirement/logic/retirementCalculator';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
  type RetirementPlan,
} from '@/domains/retirement/types';
import { formatCurrency } from '@/ui/utils';

export type {
  RetirementExpenseCategory,
  RetirementIncomeSource,
  RetirementOneTimeEvent,
};

export type { StartingNetWorthSource } from '@/application/retirement/use_cases/getStartingNetWorthUseCase';

export interface RetirementPlanListItemVM {
  id: string;
  name: string;
  isActive: boolean;
  retirementAge: number;
  statusText: string;
  finalNetWorthText: string;
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
  inflationRate: plan.inflationRate,
  investmentReturnRate: plan.investmentReturnRate,
});

export const mapRetirementPlanToListItemVM = (plan: RetirementPlan): RetirementPlanListItemVM => ({
  id: plan.id,
  name: plan.name,
  isActive: plan.isActive,
  retirementAge: plan.retirementAge,
  statusText: plan.isActive ? 'Active' : 'Inactive',
  finalNetWorthText: plan.summary?.finalNetWorth != null
    ? formatCurrency(plan.summary.finalNetWorth)
    : '—',
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
  amountText:
    income.currentAnnual != null
      ? `${formatCurrency(income.currentAnnual)}/yr`
      : '—',
  growthText: income.growthRate != null ? `${income.growthRate}% growth` : 'Inflation',
  periodText: income.lifelong
    ? `${income.startYear} - 終身`
    : `${income.startYear} - ${income.endYear ?? '-'}`,
});

export interface RetirementExpenseItemVM {
  id: string;
  name: string;
  amountText: string;
  growthAndMultiplierText: string;
  periodText: string;
  modeLabel: string;
  retirementModeLabel?: string;
  expenseTypeLabel?: string;
  debtModeLabel?: string;
}

export const mapRetirementExpenseToVM = (
  expense: RetirementExpenseCategory,
): RetirementExpenseItemVM => {
  const isDebtPayment = expense.type === 'debt_payment';
  const amountText = `${formatCurrency(expense.currentAnnual)}/yr`;
  const retirementModeText = `${expense.retirementMultiplier * 100}% after retirement`;
  return {
    id: expense.id,
    name: expense.name,
    amountText,
    growthAndMultiplierText: `${
      expense.growthRate != null ? `${expense.growthRate}% growth` : 'Inflation'
    } ${retirementModeText}`,
    periodText: `${expense.startYear} - ${expense.endYear ?? 'Lifetime'}`,
    modeLabel: isDebtPayment ? 'debt_payment' : 'fixed',
    expenseTypeLabel: isDebtPayment ? 'debt_payment' : undefined,
    debtModeLabel: isDebtPayment
      ? expense.interestOnly
        ? 'interest only'
        : expense.includesPrincipal
          ? 'includes principal'
          : undefined
      : undefined,
  };
};

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
  const phases = normalizeRetirementEventPhases(event);
  const minYear =
    phases.length > 0 ? Math.min(...phases.map((phase) => phase.startYear)) : event.year;
  const maxYear =
    phases.length > 0 ? Math.max(...phases.map((phase) => phase.endYear)) : event.year;
  const isIncome = event.type === 'income';
  const amountText =
    phases.length <= 1 && phases[0]?.amount != null
      ? `${isIncome ? '+' : '-'}${formatCurrency(phases[0].amount)}`
      : `${phases.length} phases`;

  return {
    id: event.id,
    name: event.name,
    note: event.note,
    yearText: `Year: ${minYear}${maxYear && maxYear !== minYear ? `-${maxYear}` : ''}`,
    amountText,
    typeText: event.type,
    amountClassName: isIncome ? 'text-positive' : 'text-negative',
  };
};

export interface RetirementProjectionPointVM {
  year: number;
  age: number;
  income: number;
  expense: number;
  netCashFlow: number;
  savings: number;
  incomeText: string;
  expenseText: string;
  netCashFlowText: string;
  savingsText: string;
  isBankruptYear: boolean;
  isRetired: boolean;
}

export interface RetirementProjectionYearDetailVM {
  year: number;
  age: number;
  isRetired: boolean;
  statusText: string;
  incomeText: string;
  expenseText: string;
  investmentReturnText: string;
  netCashFlowText: string;
  savingsText: string;
  incomeItems: Array<{ name: string; amountText: string }>;
  expenseItems: Array<{ name: string; amountText: string }>;
}

export interface ExpenseBreakdownSlice {
  name: string;
  value: number;
  type: 'fixed' | 'variable';
}

export interface RetirementProjectionVM {
  retirementYear: number;
  retirementSavingsText: string;
  minYearText: string;
  minSavingsText: string;
  bankruptText: string;
  bankruptClassName: string;
  chartData: RetirementProjectionPointVM[];
  yearlyDetails: RetirementProjectionYearDetailVM[];
  expenseBreakdownChartData: ExpenseBreakdownSlice[] | null;
}

export const mapRetirementProjectionToVM = (
  projection: RetirementProjection[],
  retirementYear: number,
  plan?: RetirementPlan,
): RetirementProjectionVM => {
  const retirementSnapshot = projection.find((item) => item.year === retirementYear);
  const bankruptSnapshot = projection.find((item) => item.savings < 0);

  let minSnapshot = projection[0];
  for (const snapshot of projection) {
    if (!minSnapshot || snapshot.savings < minSnapshot.savings) {
      minSnapshot = snapshot;
    }
  }

  // Build expense breakdown pie data from retirement-year expenses
  let expenseBreakdownChartData: ExpenseBreakdownSlice[] | null = null;
  if (plan) {
    const sampleYear = resolveSampleYear(plan);

    const slices: ExpenseBreakdownSlice[] = plan.expenses
      .filter(
        (e) => e.startYear <= retirementYear && (e.endYear == null || e.endYear >= retirementYear),
      )
      .map((e): ExpenseBreakdownSlice => {
        const value = calculateYearlyExpense(e, retirementYear, plan, sampleYear);
        return { name: e.name, value, type: 'fixed' };
      })
      .filter((s) => s.value > 0);
    if (slices.length > 0) expenseBreakdownChartData = slices;
  }

  return {
    retirementYear,
    retirementSavingsText: formatCurrency(retirementSnapshot?.savings ?? 0),
    minYearText: String(minSnapshot?.year ?? '-'),
    minSavingsText: formatCurrency(minSnapshot?.savings ?? 0),
    bankruptText: bankruptSnapshot ? `是 (${bankruptSnapshot.year})` : '否',
    bankruptClassName: bankruptSnapshot ? 'text-negative' : 'text-positive',
    chartData: projection.map((item) => ({
      year: item.year,
      age: item.age,
      income: item.income,
      expense: item.expense,
      netCashFlow: item.netCashFlow,
      savings: item.savings,
      incomeText: formatCurrency(item.income),
      expenseText: formatCurrency(item.expense),
      netCashFlowText: formatCurrency(item.netCashFlow),
      savingsText: formatCurrency(item.savings),
      isBankruptYear: bankruptSnapshot?.year === item.year,
      isRetired: item.isRetired,
    })),
    yearlyDetails: projection.map((item) => ({
      year: item.year,
      age: item.age,
      isRetired: item.isRetired,
      statusText: item.isRetired ? 'Retired' : 'Working',
      incomeText: formatCurrency(item.income),
      expenseText: formatCurrency(item.expense),
      investmentReturnText: formatCurrency(item.investmentIncome),
      netCashFlowText: formatCurrency(item.netCashFlow),
      savingsText: formatCurrency(item.savings),
      incomeItems: item.incomeBreakdown.map((line) => ({
        name: line.name,
        amountText: formatCurrency(line.amount),
      })),
      expenseItems: item.expenseBreakdown.map((line) => ({
        name: line.name,
        amountText: formatCurrency(line.amount),
      })),
    })),
    expenseBreakdownChartData,
  };
};
