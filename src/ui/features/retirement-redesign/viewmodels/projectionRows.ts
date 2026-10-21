import {
  type ProjectionYearResult,
  type RuleSourceSnapshot,
} from '@/domains/retirement/logic/projectionTypes';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement-redesign/displayLabels';
import {
  BASELINE_POLICY_LABELS,
  END_CONDITION_LABELS,
} from '@/ui/constants/retirement-redesign/setupLabels';
import {
  type RetirementProjectionPointVM,
  type RetirementProjectionYearDetailVM,
} from '@/ui/features/retirement-redesign/viewmodels/projectionDisplayVm';
import { formatCurrency } from '@/ui/utils';

export const percentText = (value: number): string => `${Number((value * 100).toFixed(4))}%`;

/** One wording source for the projection parameter column. */
export function parameterText(rule: ProjectionRule): string {
  if ('rate' in rule.parameters) {
    return `${PROJECTION_COMMON_LABELS.RATE_PREFIX} ${percentText(rule.parameters.rate)}`;
  }
  if ('ratio' in rule.parameters) {
    return `${PROJECTION_COMMON_LABELS.RATIO_PREFIX} ${percentText(rule.parameters.ratio)}`;
  }
  if ('amount' in rule.parameters) return formatCurrency(rule.parameters.amount);
  return PROJECTION_COMMON_LABELS.DASH;
}

/** One wording source for the projection end-condition column. */
export function endConditionText(rule: ProjectionRule): string {
  if (rule.endCondition === undefined) return PROJECTION_COMMON_LABELS.DASH;
  switch (rule.endCondition.type) {
    case 'retirementYearExclusive':
      return END_CONDITION_LABELS.retirementYearExclusive;
    case 'specificAge':
      return `${END_CONDITION_LABELS.specificAge} ${rule.endCondition.age}`;
    case 'specificYear':
      return `${END_CONDITION_LABELS.specificYear} ${rule.endCondition.year}`;
    case 'lifelong':
      return END_CONDITION_LABELS.lifelong;
  }
}

export function baselinePolicyText(snapshot: RuleSourceSnapshot): string {
  return snapshot.baselineYear === undefined
    ? PROJECTION_COMMON_LABELS.DASH
    : BASELINE_POLICY_LABELS.previousCompleteYear;
}

export function statusText(isRetired: boolean): string {
  return isRetired ? PROJECTION_COMMON_LABELS.RETIRED : PROJECTION_COMMON_LABELS.WORKING;
}

export function mapProjectionPoint(
  entry: ProjectionYearResult,
  income: number,
  expense: number,
  bankruptYear: number | null,
): RetirementProjectionPointVM {
  const netCashFlow = entry.inflows - entry.outflows;

  return {
    year: entry.year,
    age: entry.age,
    income,
    expense,
    investmentIncome: entry.return,
    netCashFlow,
    savings: entry.closing,
    incomeText: formatCurrency(income),
    expenseText: formatCurrency(expense),
    investmentIncomeText: formatCurrency(entry.return),
    netCashFlowText: formatCurrency(netCashFlow),
    savingsText: formatCurrency(entry.closing),
    isBankruptYear: bankruptYear === entry.year,
    isRetired: entry.isRetired,
  };
}

export function mapYearlyDetail(entry: ProjectionYearResult): RetirementProjectionYearDetailVM {
  return {
    year: entry.year,
    age: entry.age,
    isRetired: entry.isRetired,
    statusText: statusText(entry.isRetired),
    incomeText: formatCurrency(entry.inflows),
    expenseText: formatCurrency(entry.outflows),
    investmentReturnText: formatCurrency(entry.return),
    netCashFlowText: formatCurrency(entry.inflows - entry.outflows),
    savingsText: formatCurrency(entry.closing),
  };
}
