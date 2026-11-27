import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import {
  type ProjectionYearResult,
  type RuleSourceSnapshot,
} from '@/domains/retirement/projectionTypes';
import {
  PROJECTION_COMMON_LABELS,
  PROJECTION_YEARLY_DETAIL_LABELS,
} from '@/ui/constants/retirement/displayLabels';
import {
  BASELINE_POLICY_LABELS,
  END_CONDITION_LABELS,
} from '@/ui/constants/retirement/setupLabels';
import {
  type RetirementProjectionItemVM,
  type RetirementProjectionPointVM,
  type RetirementProjectionYearDetailVM,
} from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';
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
  // Net worth change, not cash flow: the investment return is part of it so the
  // line closes against `closing` and never contradicts the asset line.
  const netCashFlow = entry.inflows - entry.outflows + entry.return;

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

/** Falls back to the raw source ref when the frozen config lost the name. */
export type ItemLabelResolver = (sourceRef: string) => string;

/** The only two fields a name lookup needs; both snapshots and config satisfy it. */
export interface SourceNames {
  projectionRules: { id: string; name: string }[];
  lifeEvents: { id: string; name: string }[];
}

/**
 * One home for rule/event names. Both VMs read the same frozen config so the
 * preview and the stored view can never word the same line differently.
 */
export function sourceLabelResolver(config: SourceNames): ItemLabelResolver {
  const names = new Map([
    ...config.projectionRules.map((rule) => [rule.id, rule.name] as const),
    ...config.lifeEvents.map((event) => [event.id, event.name] as const),
  ]);
  return (sourceRef) => names.get(sourceRef) ?? sourceRef;
}

function mapItems(
  items: ProjectionYearResult['inflowItems'] | undefined,
  resolveLabel: ItemLabelResolver,
): RetirementProjectionItemVM[] {
  return [...(items ?? [])]
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({
      sourceRef: item.sourceRef,
      label: resolveLabel(item.sourceRef),
      amount: item.amount,
      amountText: formatCurrency(item.amount),
      originText: ORIGIN_TEXT[item.origin],
    }));
}

const ORIGIN_TEXT = {
  rule: PROJECTION_YEARLY_DETAIL_LABELS.originRule,
  event: PROJECTION_YEARLY_DETAIL_LABELS.originEvent,
} as const;

export function mapYearlyDetail(
  entry: ProjectionYearResult,
  resolveLabel: ItemLabelResolver = (sourceRef) => sourceRef,
): RetirementProjectionYearDetailVM {
  return {
    year: entry.year,
    age: entry.age,
    isRetired: entry.isRetired,
    statusText: statusText(entry.isRetired),
    incomeText: formatCurrency(entry.inflows),
    expenseText: formatCurrency(entry.outflows),
    investmentReturnText: formatCurrency(entry.return),
    inflowItems: mapItems(entry.inflowItems, resolveLabel),
    outflowItems: mapItems(entry.outflowItems, resolveLabel),
    netCashFlow: entry.inflows - entry.outflows + entry.return,
    netCashFlowText: formatCurrency(entry.inflows - entry.outflows + entry.return),
    opening: entry.opening,
    openingText: formatCurrency(entry.opening),
    savingsText: formatCurrency(entry.closing),
  };
}
