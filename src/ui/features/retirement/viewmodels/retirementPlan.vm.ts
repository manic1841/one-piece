import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { type RetirementPlan } from '@/domains/retirement/types';
import { type DefinitionItem } from '@/ui/components/DefinitionRows';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement/planLabels';
import {
  ASSUMPTION_LABELS,
  RULE_LABELS,
  RULE_TYPE_LABELS,
} from '@/ui/constants/retirement/setupLabels';
import {
  endConditionText,
  percentText,
} from '@/ui/features/retirement/viewmodels/projectionRows.vm';
import { type SnapshotEventVM } from '@/ui/features/retirement/viewmodels/projectionSnapshot.vm';
import { formatCurrency, formatDate } from '@/ui/utils';

export type { SnapshotEventVM };

export interface PlanRuleVM {
  id: string;
  name: string;
  isDisabled: boolean;
  /** One sentence: method, parameter, source and end condition. */
  summary: string;
}

export interface PlanRuleGroupVM {
  key: 'income' | 'expense';
  title: string;
  rows: PlanRuleVM[];
}

export interface PlanScenarioVM {
  /** Retirement year, the hero number. */
  retirementYearText: string;
  /** Distance from this year to retirement, or the retired marker. */
  distanceText: string;
  /** Period the plan spans: retirement year to life expectancy. */
  spanText: string;
  /** One line naming the scenario: born / retires / life expectancy. */
  descriptionText: string;
}

export interface PlanTimelineVM {
  startYear: number;
  endYear: number;
  retirementYear: number | null;
}

export interface RetirementPlanVM {
  id: string;
  name: string;
  updatedAtText: string;
  scenario: PlanScenarioVM;
  assumptions: DefinitionItem[];
  ruleGroups: PlanRuleGroupVM[];
  ruleCount: number;
  events: SnapshotEventVM[];
  timeline: PlanTimelineVM;
}

/** Source names resolved by the page; unknown ids fall back to the raw id. */
export interface PlanSourceNames {
  ledger: ReadonlyMap<string, string>;
  debt: ReadonlyMap<string, string>;
}

const lowerFirst = (text: string): string =>
  text.length === 0 ? text : text[0].toLowerCase() + text.slice(1);

/** Age and year conditions need a boundary word; the other conditions already carry one. */
function endOfSentence(rule: ProjectionRule): string {
  const text = endConditionText(rule);
  return rule.endCondition !== undefined &&
    (rule.endCondition.type === 'specificAge' || rule.endCondition.type === 'specificYear')
    ? `${PLAN_DETAIL_LABELS.UNTIL} ${lowerFirst(text)}`
    : lowerFirst(text);
}

function sourceName(rule: ProjectionRule, names: PlanSourceNames): string {
  const source = rule.source;
  if (source === undefined) return RULE_LABELS.NO_SOURCE;
  switch (source.type) {
    case 'ledgerCode':
      return names.ledger.get(source.id) ?? source.id;
    case 'debtAccount':
      return names.debt.get(source.id) ?? source.id;
    case 'rule':
      return source.id;
  }
}

/** The rule as a sentence: how it grows, from where, and until when. */
function ruleSummary(
  rule: ProjectionRule,
  names: PlanSourceNames,
  ruleNames: ReadonlyMap<string, string>,
): string {
  const source =
    rule.source?.type === 'rule'
      ? (ruleNames.get(rule.source.id) ?? RULE_LABELS.NO_SOURCE)
      : sourceName(rule, names);

  // A source that repeats the rule's own name adds nothing to the sentence.
  const namedSource = source === rule.name ? null : source;
  const behavior = (() => {
    switch (rule.method) {
      case 'inflation':
        return [RULE_LABELS.SUMMARY_FOLLOWS_INFLATION, namedSource]
          .filter((part) => part !== null)
          .join(' · ');
      case 'growthRate':
        return 'rate' in rule.parameters
          ? [
              `${percentText(rule.parameters.rate)} ${RULE_LABELS.SUMMARY_ANNUAL_GROWTH}`,
              namedSource,
            ]
              .filter((part) => part !== null)
              .join(' · ')
          : source;
      case 'percentage':
        return 'ratio' in rule.parameters
          ? `${percentText(rule.parameters.ratio)} ${RULE_LABELS.SUMMARY_OF} ${source}`
          : source;
      case 'fixedAmount':
        return 'amount' in rule.parameters
          ? `${formatCurrency(rule.parameters.amount)} ${RULE_LABELS.SUMMARY_PER_YEAR}`
          : PROJECTION_COMMON_LABELS.DASH;
      case 'debtAmortization':
        return `${source} · ${RULE_LABELS.SUMMARY_LOAN_SCHEDULE}`;
    }
  })();

  return [
    behavior,
    // An inflation method already says it; only the other methods need the flag spelled out.
    ...(rule.keepsPaceWithInflation === true && rule.method !== 'inflation'
      ? [RULE_LABELS.SUMMARY_FOLLOWS_INFLATION]
      : []),
    endOfSentence(rule),
  ]
    .filter((part) => part !== PROJECTION_COMMON_LABELS.DASH)
    .join(' · ');
}

/**
 * Groups by side so the type stops repeating per row and income reads before
 * expense, matching the workspace and the projection snapshot.
 */
function buildRuleGroups(rules: ProjectionRule[], names: PlanSourceNames): PlanRuleGroupVM[] {
  const ruleNames = new Map(rules.map((rule) => [rule.id, rule.name] as const));

  return (['income', 'expense'] as const).flatMap((side) => {
    const rows = rules
      .filter((rule) => rule.ruleType === side)
      .map<PlanRuleVM>((rule) => ({
        id: rule.id,
        name: rule.name,
        isDisabled: !rule.enabled,
        summary: ruleSummary(rule, names, ruleNames),
      }));
    return rows.length === 0 ? [] : [{ key: side, title: RULE_TYPE_LABELS[side], rows }];
  });
}

const spanText = (start: number | undefined, end: number | undefined): string => {
  if (start === undefined || end === undefined) return PROJECTION_COMMON_LABELS.DASH;
  return start === end ? String(start) : `${start}–${end}`;
};

function timingText(
  firstStart: number | undefined,
  lastEnd: number | undefined,
  retirementYear: number | null,
): string {
  if (firstStart === undefined || lastEnd === undefined || retirementYear === null) {
    return PROJECTION_COMMON_LABELS.DASH;
  }
  if (firstStart <= retirementYear && retirementYear <= lastEnd) {
    return PLAN_DETAIL_LABELS.EVENT_DURING_RETIREMENT;
  }
  return lastEnd < retirementYear
    ? PLAN_DETAIL_LABELS.EVENT_BEFORE_RETIREMENT
    : PLAN_DETAIL_LABELS.EVENT_AFTER_RETIREMENT;
}

function buildEvents(events: LifeEvent[], timeline: PlanTimelineVM): SnapshotEventVM[] {
  return events.map((event) => {
    const starts = event.phases.map((phase) => phase.startYear);
    const ends = event.phases.map((phase) => phase.endYear);
    const firstStart = starts.length === 0 ? undefined : Math.min(...starts);
    const lastEnd = ends.length === 0 ? undefined : Math.max(...ends);
    const isOutside =
      firstStart !== undefined &&
      lastEnd !== undefined &&
      (lastEnd < timeline.startYear || firstStart > timeline.endYear);
    const isClipped =
      !isOutside &&
      event.phases.some(
        (phase) => phase.startYear < timeline.startYear || phase.endYear > timeline.endYear,
      );

    return {
      id: event.id,
      name: event.name,
      typeText: RULE_TYPE_LABELS[event.type],
      rangeText: spanText(firstStart, lastEnd),
      timingText: timingText(firstStart, lastEnd, timeline.retirementYear),
      isDisabled: !event.enabled,
      isClipped,
      isOutside,
      phases: event.phases.map((phase) => ({
        rangeText: spanText(phase.startYear, phase.endYear),
        amountText: formatCurrency(phase.amount),
        ...(phase.growthRate === undefined
          ? {}
          : { growthRateText: percentText(phase.growthRate) }),
        clippedStartYear: Math.min(Math.max(phase.startYear, timeline.startYear), timeline.endYear),
        clippedEndYear: Math.min(Math.max(phase.endYear, timeline.startYear), timeline.endYear),
      })),
    };
  });
}

export function mapRetirementPlanToVM(
  plan: RetirementPlan,
  names: PlanSourceNames,
  currentYear: number,
): RetirementPlanVM {
  const { birthYear, retirementAge, lifeExpectancy } = plan.assumptions;
  const retirementYear = birthYear + retirementAge;
  const planEndYear = birthYear + lifeExpectancy;
  const timeline: PlanTimelineVM = {
    startYear: Math.min(currentYear, planEndYear),
    endYear: planEndYear,
    retirementYear,
  };
  const yearsToRetirement = retirementYear - currentYear;

  return {
    id: plan.id,
    name: plan.name,
    updatedAtText: formatDate(plan.updatedAt),
    scenario: {
      retirementYearText: String(retirementYear),
      distanceText:
        yearsToRetirement > 0
          ? PLAN_DETAIL_LABELS.YEARS_TO_RETIREMENT(yearsToRetirement)
          : PLAN_DETAIL_LABELS.RETIRED,
      spanText: `${retirementYear}–${planEndYear}`,
      descriptionText: PLAN_DETAIL_LABELS.SCENARIO_DESCRIPTION(
        birthYear,
        retirementAge,
        retirementYear,
        lifeExpectancy,
      ),
    },
    assumptions: [
      { label: ASSUMPTION_LABELS.BIRTH_YEAR, value: String(birthYear) },
      { label: ASSUMPTION_LABELS.RETIREMENT_AGE, value: String(retirementAge) },
      { label: ASSUMPTION_LABELS.LIFE_EXPECTANCY, value: String(lifeExpectancy) },
      {
        label: ASSUMPTION_LABELS.INFLATION_RATE,
        value: percentText(plan.assumptions.inflationRate),
      },
      {
        label: ASSUMPTION_LABELS.ANNUAL_RETURN_RATE,
        value: percentText(plan.assumptions.annualReturnRate),
      },
    ],
    ruleGroups: buildRuleGroups(plan.projectionRules, names),
    ruleCount: plan.projectionRules.length,
    events: buildEvents(plan.lifeEvents, timeline),
    timeline,
  };
}
