import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { type RetirementPlan } from '@/domains/retirement/types';
import { type DefinitionItem } from '@/ui/components/DefinitionRows';
import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement/planLabels';
import { ASSUMPTION_LABELS, RULE_LABELS, RULE_TYPE_LABELS } from '@/ui/constants/retirement/setupLabels';
import { percentText } from '@/ui/features/retirement/viewmodels/projectionRows.vm';
import {
  type EventAxis,
  type EventVocabulary,
  type SourceResolver,
  type SnapshotEventVM,
  buildEventRows,
  buildRuleSentence,
} from '@/ui/features/retirement/viewmodels/retirementPlanRows.vm';
import { formatDate } from '@/ui/utils';

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

export interface PlanNarrativeVM {
  /** Retirement year, the hero number. */
  retirementYearText: string;
  /** Distance from this year to retirement, or the retired marker. */
  distanceText: string;
  /** Period the plan spans: retirement year to life expectancy. */
  spanText: string;
  /** One line naming the plan: born / retires / life expectancy. */
  descriptionText: string;
}

/** The plan timeline is the event axis: same window, same markers. */
export type PlanTimelineVM = EventAxis;

export interface RetirementPlanVM {
  id: string;
  name: string;
  updatedAtText: string;
  narrative: PlanNarrativeVM;
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

/** The plan narrative's wording; the shared builder owns the grammar. */
const NARRATIVE_VOCABULARY: EventVocabulary = {
  retiring: PLAN_DETAIL_LABELS.EVENT_DURING_RETIREMENT,
  before: PLAN_DETAIL_LABELS.EVENT_BEFORE_RETIREMENT,
  after: PLAN_DETAIL_LABELS.EVENT_AFTER_RETIREMENT,
  income: RULE_TYPE_LABELS.income,
  expense: RULE_TYPE_LABELS.expense,
};

/**
 * Groups by side so the type stops repeating per row and income reads before
 * expense, matching the workspace and the projection snapshot.
 */
function buildRuleGroups(rules: ProjectionRule[], names: PlanSourceNames): PlanRuleGroupVM[] {
  const ruleNames = new Map(rules.map((rule) => [rule.id, rule.name] as const));
  const resolveSource: SourceResolver = (source) =>
    source.type === 'rule'
      ? (ruleNames.get(source.id) ?? RULE_LABELS.NO_SOURCE)
      : (names.ledger.get(source.id) ?? names.debt.get(source.id) ?? source.id);

  return (['income', 'expense'] as const).flatMap((side) => {
    const rows = rules
      .filter((rule) => rule.ruleType === side)
      .map<PlanRuleVM>((rule) => ({
        id: rule.id,
        name: rule.name,
        isDisabled: !rule.enabled,
        summary: buildRuleSentence(rule, resolveSource),
      }));
    return rows.length === 0 ? [] : [{ key: side, title: RULE_TYPE_LABELS[side], rows }];
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
  // The axis starts where the plan's own content starts, not at "today": a plan
  // carries no timeline (ADR-0083), so borrowing the clock would make the same
  // plan look different in another year.
  const firstPhaseYear = Math.min(
    ...plan.lifeEvents.flatMap((event) => event.phases.map((phase) => phase.startYear)),
  );
  const timeline: PlanTimelineVM = {
    startYear: Math.min(Number.isFinite(firstPhaseYear) ? firstPhaseYear : currentYear, planEndYear),
    endYear: planEndYear,
    retirementYear,
  };
  const yearsToRetirement = retirementYear - currentYear;

  return {
    id: plan.id,
    name: plan.name,
    updatedAtText: formatDate(plan.updatedAt),
    narrative: {
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
    events: buildEventRows(plan.lifeEvents, timeline, NARRATIVE_VOCABULARY),
    timeline,
  };
}
