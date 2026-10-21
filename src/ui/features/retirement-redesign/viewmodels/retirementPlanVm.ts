import { type RetirementPlan } from '@/application/retirement/use_cases/retirementPlanLookup';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { EVENT_LABELS, EVENT_TYPE_LABELS } from '@/ui/constants/retirement-redesign/eventLabels';
import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement-redesign/planLabels';
import {
  ASSUMPTION_LABELS,
  BASELINE_POLICY_LABELS,
  END_CONDITION_LABELS,
  RULE_LABELS,
  RULE_METHOD_LABELS,
  RULE_TYPE_LABELS,
} from '@/ui/constants/retirement-redesign/setupLabels';
import { formatCurrency } from '@/ui/utils';

export interface PlanDefinitionRow {
  label: string;
  value: string;
}

export interface PlanRuleVM {
  id: string;
  name: string;
  side: string;
  method: string;
  parameterLabel: string;
  parameter: string;
  source: string;
  endCondition: string;
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
  assumptions: PlanDefinitionRow[];
  rules: PlanRuleVM[];
  events: PlanEventVM[];
}

const DASH = '—';

const percent = (value: number): string => `${Number((value * 100).toFixed(4))}%`;

function ruleParameter(rule: ProjectionRule): string {
  switch (rule.method) {
    case 'growthRate':
      return percent((rule.parameters as { rate: number }).rate);
    case 'percentage':
      return percent((rule.parameters as { ratio: number }).ratio);
    case 'fixedAmount':
      return formatCurrency((rule.parameters as { amount: number }).amount);
    case 'inflation':
    case 'debtAmortization':
      return DASH;
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
  if (rule.endCondition === undefined || rule.endCondition === null) return DASH;

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
  return DASH;
}

function sourceLabel(source: ProjectionRule['source'], ruleNames: Map<string, string>): string {
  if (source === undefined || source === null) return DASH;

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
        growthRate: phase.growthRate === undefined ? DASH : percent(phase.growthRate),
      })),
    })),
  };
}
