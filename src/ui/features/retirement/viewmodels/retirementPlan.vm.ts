import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { type RetirementPlan } from '@/domains/retirement/types';
import { type DefinitionItem } from '@/ui/components/DefinitionRows';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { EVENT_LABELS, EVENT_TYPE_LABELS } from '@/ui/constants/retirement/eventLabels';
import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement/planLabels';
import {
  ASSUMPTION_LABELS,
  BASELINE_POLICY_LABELS,
  END_CONDITION_LABELS,
  RULE_LABELS,
  RULE_METHOD_LABELS,
  RULE_TYPE_LABELS,
} from '@/ui/constants/retirement/setupLabels';
import { formatCurrency, formatDate } from '@/ui/utils';

export type PlanDefinitionRow = DefinitionItem;

export interface PlanRuleVM {
  id: string;
  name: string;
  side: string;
  method: string;
  parameterLabel: string;
  parameter: string;
  source: string;
  endCondition: string;
  keepsPace: string;
  baselinePolicy: string;
  enabled: string;
}

export interface PlanEventPhaseVM {
  key: string;
  name: string;
  startYear: number;
  endYear: number;
  amount: string;
  growthRate: string;
}

export interface PlanEventVM {
  id: string;
  name: string;
  type: string;
  enabled: string;
  phases: PlanEventPhaseVM[];
}

export interface RetirementPlanVM {
  id: string;
  name: string;
  updatedAtText: string;
  assumptions: PlanDefinitionRow[];
  rules: PlanRuleVM[];
  events: PlanEventVM[];
}

const percent = (value: number): string => `${Number((value * 100).toFixed(4))}%`;

function ruleParameter(rule: ProjectionRule): string {
  switch (rule.method) {
    case 'growthRate':
      return 'rate' in rule.parameters
        ? percent(rule.parameters.rate)
        : PROJECTION_COMMON_LABELS.DASH;
    case 'percentage':
      return 'ratio' in rule.parameters
        ? percent(rule.parameters.ratio)
        : PROJECTION_COMMON_LABELS.DASH;
    case 'fixedAmount':
      return 'amount' in rule.parameters
        ? formatCurrency(rule.parameters.amount)
        : PROJECTION_COMMON_LABELS.DASH;
    case 'inflation':
    case 'debtAmortization':
      return PROJECTION_COMMON_LABELS.DASH;
  }
}

function parameterLabel(rule: ProjectionRule): string {
  switch (rule.method) {
    case 'growthRate':
      return RULE_LABELS.PARAMETER_RATE;
    case 'percentage':
      return RULE_LABELS.PARAMETER_RATIO;
    case 'fixedAmount':
      return RULE_LABELS.PARAMETER_AMOUNT;
    case 'inflation':
    case 'debtAmortization':
      return RULE_LABELS.METHOD;
  }
}

function endCondition(rule: ProjectionRule): string {
  if (rule.endCondition === undefined || rule.endCondition === null)
    return PROJECTION_COMMON_LABELS.DASH;

  switch (rule.endCondition.type) {
    case 'specificAge':
      return `${END_CONDITION_LABELS.specificAge} ${rule.endCondition.age}`;
    case 'specificYear':
      return `${END_CONDITION_LABELS.specificYear} ${rule.endCondition.year}`;
    default:
      return END_CONDITION_LABELS[rule.endCondition.type];
  }
}

function baselinePolicy(rule: ProjectionRule): string {
  const policy = rule.baselinePolicy;
  if (policy === 'previousCompleteYear' || policy === 'specificYear') {
    return BASELINE_POLICY_LABELS[policy];
  }
  return PROJECTION_COMMON_LABELS.DASH;
}

function sourceLabel(source: ProjectionRule['source'], ruleNames: Map<string, string>): string {
  if (source === undefined || source === null) return PROJECTION_COMMON_LABELS.DASH;

  switch (source.type) {
    case 'ledgerCode':
      return `${PLAN_DETAIL_LABELS.SOURCE_LEDGER}: ${source.id}`;
    case 'debtAccount':
      return `${PLAN_DETAIL_LABELS.SOURCE_DEBT}: ${source.id}`;
    case 'rule':
      return `${PLAN_DETAIL_LABELS.SOURCE_RULE}: ${ruleNames.get(source.id) ?? source.id}`;
  }
}

export function mapRetirementPlanToVM(plan: RetirementPlan): RetirementPlanVM {
  const ruleNames = new Map(plan.projectionRules.map((rule) => [rule.id, rule.name] as const));

  return {
    id: plan.id,
    name: plan.name,
    updatedAtText: formatDate(plan.updatedAt),
    assumptions: [
      { label: ASSUMPTION_LABELS.BIRTH_YEAR, value: String(plan.assumptions.birthYear) },
      { label: ASSUMPTION_LABELS.RETIREMENT_AGE, value: String(plan.assumptions.retirementAge) },
      {
        label: ASSUMPTION_LABELS.LIFE_EXPECTANCY,
        value: String(plan.assumptions.lifeExpectancy),
      },
      { label: ASSUMPTION_LABELS.INFLATION_RATE, value: percent(plan.assumptions.inflationRate) },
      {
        label: ASSUMPTION_LABELS.ANNUAL_RETURN_RATE,
        value: percent(plan.assumptions.annualReturnRate),
      },
    ],
    rules: plan.projectionRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      side: RULE_TYPE_LABELS[rule.ruleType],
      method: RULE_METHOD_LABELS[rule.method],
      parameterLabel: parameterLabel(rule),
      parameter: ruleParameter(rule),
      source: sourceLabel(rule.source, ruleNames),
      endCondition: endCondition(rule),
      keepsPace:
        rule.keepsPaceWithInflation === true
          ? PROJECTION_COMMON_LABELS.CHECK
          : PROJECTION_COMMON_LABELS.DASH,
      baselinePolicy: baselinePolicy(rule),
      enabled: rule.enabled ? RULE_LABELS.ENABLED : RULE_LABELS.DISABLED,
    })),
    events: plan.lifeEvents.map((event) => ({
      id: event.id,
      name: event.name,
      type: EVENT_TYPE_LABELS[event.type],
      enabled: event.enabled ? EVENT_LABELS.ENABLED : EVENT_LABELS.DISABLED,
      phases: event.phases.map((phase, index) => ({
        key: `${event.id}-${index}`,
        name: phase.name ?? PLAN_DETAIL_LABELS.UNNAMED_PHASE,
        startYear: phase.startYear,
        endYear: phase.endYear,
        amount: formatCurrency(phase.amount),
        growthRate:
          phase.growthRate === undefined
            ? PROJECTION_COMMON_LABELS.DASH
            : percent(phase.growthRate),
      })),
    })),
  };
}
