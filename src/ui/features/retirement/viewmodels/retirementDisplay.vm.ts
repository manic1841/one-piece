import { calculateYearlyExpense } from '@/domains/retirement/logic/expenseEngine';
import { resolveSampleYear } from '@/domains/retirement/logic/retirementCalculator';
import {
  type NormalizedRetirementEventPhase,
  calculateRetirementEventPhaseAmount,
  normalizeRetirementEventPhases,
} from '@/domains/retirement/logic/retirementEventPhases';
import { type RetirementProjection } from '@/domains/retirement/logic/retirementPlanProjection';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
  type RetirementPlan,
} from '@/domains/retirement/types';
import { type MoneyTone } from '@/ui/components/moneyTone';
import { RETIREMENT_LIST_LABELS } from '@/ui/constants/retirement/retirementListLabels';
import {
  RetirementRiskLabels,
  RetirementTabContentLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { formatCurrency } from '@/ui/utils';

export type { RetirementExpenseCategory, RetirementIncomeSource, RetirementOneTimeEvent };

export type { StartingNetWorthSource } from '@/application/retirement/use_cases/getStartingNetWorthUseCase';

export interface RetirementPlanListItemVM {
  id: string;
  name: string;
  isActive: boolean;
  retirementAge: number;
  statusText: string;
  finalNetWorthText: string;
}

/**
 * Active plan first, otherwise keep the incoming order. The repository already returns
 * plans by `updatedAt` desc, so this is a stable partition — not a re-sort (issue #264).
 */
export const sortRetirementPlanListItems = (
  items: RetirementPlanListItemVM[],
): RetirementPlanListItemVM[] => [
  ...items.filter((item) => item.isActive),
  ...items.filter((item) => !item.isActive),
];

export interface RetirementPlanHeaderVM {
  id: string;
  name: string;
  retirementSummaryText: string;
  autoUpdate: boolean;
}

/**
 * The 基準年份 — the system's "now" year. It advances with time and is the base the
 * 目前年齡 derivation anchors to (outside of `birthYear` itself); see CONTEXT.md 目前年齡.
 */
export const currentBaseYear = (): number => new Date().getFullYear();

/** 目前年齡 = 基準年份 − 出生年. The single derivation of age from the birth-year anchor. */
export const deriveCurrentAge = (birthYear: number, baseYear: number): number =>
  baseYear - birthYear;

/** 由年齡推導的年份 = 出生年 + 年齡 (退休年、預期壽命終點). */
export const deriveYearFromAge = (birthYear: number, age: number): number => birthYear + age;

/** 重新錨定出生年 = 基準年份 − 年齡 (editing the current age re-anchors the birth year). */
export const deriveBirthYear = (age: number, baseYear: number): number => baseYear - age;

export interface RetirementAssumptionsDisplayVM {
  /** 目前年齡 — a derived display value, never a stored fact. */
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  inflationRate: number;
  investmentReturnRate: number;
  /** 基準年份 (今天), shown as the parenthetical next to 目前年齡. */
  currentYear: number;
  /** 出生年 + 退休年齡, shown next to 退休年齡. */
  retirementYear: number;
  /** 出生年 + 預期壽命, shown next to 預期壽命. */
  lifeExpectancyYear: number;
}

export const mapRetirementPlanToHeaderVM = (plan: RetirementPlan): RetirementPlanHeaderVM => ({
  id: plan.id,
  name: plan.name,
  retirementSummaryText: `Retire at ${plan.retirementAge}, life expectancy ${plan.lifeExpectancy}`,
  autoUpdate: plan.autoUpdate,
});

export const mapRetirementPlanToAssumptionsDisplayVM = (
  plan: RetirementPlan,
  baseYear = currentBaseYear(),
): RetirementAssumptionsDisplayVM => ({
  currentAge: deriveCurrentAge(plan.birthYear, baseYear),
  retirementAge: plan.retirementAge,
  lifeExpectancy: plan.lifeExpectancy,
  inflationRate: plan.inflationRate,
  investmentReturnRate: plan.investmentReturnRate,
  currentYear: baseYear,
  retirementYear: deriveYearFromAge(plan.birthYear, plan.retirementAge),
  lifeExpectancyYear: deriveYearFromAge(plan.birthYear, plan.lifeExpectancy),
});

export const mapRetirementPlanToListItemVM = (plan: RetirementPlan): RetirementPlanListItemVM => ({
  id: plan.id,
  name: plan.name,
  isActive: plan.isActive,
  retirementAge: plan.retirementAge,
  statusText: plan.isActive
    ? RETIREMENT_LIST_LABELS.ACTIVE_BADGE
    : RETIREMENT_LIST_LABELS.INACTIVE_BADGE,
  finalNetWorthText:
    plan.summary?.finalNetWorth != null ? formatCurrency(plan.summary.finalNetWorth) : '—',
});

export interface RetirementEventItemVM {
  id: string;
  name: string;
  note?: string;
  yearText: string;
  amountText: string;
  /** Present only when the event is segmented, so the row still shows one money figure. */
  phaseCountText?: string;
  typeText: string;
  amountClassName: string;
}

/**
 * Lifetime cost of one phase: the per-year `amount` grown each year it spans, summed.
 */
const sumPhaseAmount = (
  phase: NormalizedRetirementEventPhase,
  planInflationRate: number,
): number => {
  let total = 0;
  for (let year = phase.startYear; year <= phase.endYear; year += 1) {
    total += calculateRetirementEventPhaseAmount(phase, year, planInflationRate);
  }
  return total;
};

/**
 * `planInflationRate` is required: a phase without an explicit `growthRate` is grown
 * by plan inflation, so a total computed without it would understate the cost.
 */
export const mapRetirementEventToVM = (
  event: RetirementOneTimeEvent,
  planInflationRate: number,
): RetirementEventItemVM => {
  const phases = normalizeRetirementEventPhases(event);
  const minYear =
    phases.length > 0 ? Math.min(...phases.map((phase) => phase.startYear)) : event.year;
  const maxYear =
    phases.length > 0 ? Math.max(...phases.map((phase) => phase.endYear)) : event.year;
  const isIncome = event.type === 'income';
  const totalAmount = phases.reduce(
    (total, phase) => total + sumPhaseAmount(phase, planInflationRate),
    0,
  );

  return {
    id: event.id,
    name: event.name,
    note: event.note,
    yearText: `Year: ${minYear}${maxYear && maxYear !== minYear ? `-${maxYear}` : ''}`,
    amountText: `${isIncome ? '+' : '-'}${formatCurrency(totalAmount)}`,
    ...(phases.length > 1 && {
      phaseCountText: RetirementTabContentLabels.phaseCount(phases.length),
    }),
    typeText: event.type,
    amountClassName: isIncome ? 'text-positive' : 'text-negative',
  };
};

export interface RetirementProjectionPointVM {
  year: number;
  age: number;
  income: number;
  expense: number;
  /** Investment income earned on the opening balance that year (issue #265). */
  investmentIncome: number;
  netCashFlow: number;
  savings: number;
  incomeText: string;
  expenseText: string;
  investmentIncomeText: string;
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

export interface RetirementRiskVM {
  key: 'retirementYear' | 'bankruptcyYear' | 'minSavingsYear' | 'lifeExpectancyEnd';
  label: string;
  valueText: string;
  tone: MoneyTone;
}

export interface RetirementProjectionVM {
  retirementYear: number;
  retirementSavingsText: string;
  minYearText: string;
  minSavingsText: string;
  bankruptText: string;
  bankruptTone: MoneyTone;
  chartData: RetirementProjectionPointVM[];
  yearlyDetails: RetirementProjectionYearDetailVM[];
  expenseBreakdownChartData: ExpenseBreakdownSlice[] | null;
  risks: RetirementRiskVM[];
}

export const mapRetirementProjectionToVM = (
  projection: RetirementProjection[],
  retirementYear: number,
  plan?: RetirementPlan,
): RetirementProjectionVM => {
  const retirementSnapshot = projection.find((item) => item.year === retirementYear);
  const bankruptSnapshot = projection.find((item) => item.savings < 0);

  // Derived from the fresh projection rather than the persisted `plan.summary`,
  // which only refreshes on explicit recalculate: minYearText and the
  // min-savings risk must agree and must not go stale after an edit.
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
    bankruptTone: bankruptSnapshot ? 'negative' : 'positive',
    chartData: projection.map((item) => ({
      year: item.year,
      age: item.age,
      income: item.income,
      expense: item.expense,
      investmentIncome: item.investmentIncome,
      netCashFlow: item.netCashFlow,
      savings: item.savings,
      incomeText: formatCurrency(item.income),
      expenseText: formatCurrency(item.expense),
      investmentIncomeText: formatCurrency(item.investmentIncome),
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
    risks: [
      {
        key: 'retirementYear',
        label: RetirementRiskLabels.retirementYear,
        valueText: String(retirementYear),
        tone: 'default',
      },
      {
        key: 'bankruptcyYear',
        label: RetirementRiskLabels.bankruptcyYear,
        valueText: bankruptSnapshot ? String(bankruptSnapshot.year) : RetirementRiskLabels.none,
        tone: bankruptSnapshot ? 'negative' : 'default',
      },
      {
        key: 'minSavingsYear',
        label: RetirementRiskLabels.minSavingsYear,
        valueText: String(minSnapshot?.year ?? RetirementRiskLabels.none),
        tone: 'default',
      },
      {
        key: 'lifeExpectancyEnd',
        label: RetirementRiskLabels.lifeExpectancyEnd,
        valueText: plan ? String(plan.birthYear + plan.lifeExpectancy) : '—',
        tone: 'default',
      },
    ],
  };
};
