import {
  type ProjectionConfig,
  type ProjectionSource,
} from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { type BaselinePolicy, type ProjectionRule } from '@/domains/retirement/projectionRules';
import { type ProjectionDocument } from '@/domains/retirement/schemas';
import { type DefinitionItem } from '@/ui/components/DefinitionRows';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PROJECTION_VIEW_LABELS } from '@/ui/constants/retirement/projectionLabels';
import { BASELINE_POLICY_LABELS, RULE_METHOD_LABELS } from '@/ui/constants/retirement/setupLabels';
import {
  endConditionText,
  parameterText,
  percentText,
} from '@/ui/features/retirement/viewmodels/projectionRows.vm';
import { formatCurrency } from '@/ui/utils';

export type { DefinitionItem };

export interface SnapshotOpeningVM {
  amountText: string;
  sourceText: string;
  anchorText: string | null;
}

export interface SnapshotRuleRowVM {
  id: string;
  name: string;
  methodText: string;
  parametersText: string;
  endConditionText: string;
  /** `✓` when the rule holds its real value, `—` otherwise. */
  keepsPaceText: string;
  /** `—` when the rule carries no baseline reference. */
  baselineText: string;
  /** Source reference (`Ledger code · expense:food`); `—` when the snapshot has none. */
  sourceText: string;
  /** `2026 · NT$10,800` — the source's baseline year and amount, muted under the source. */
  sourceBaselineText: string;
  isDisabled: boolean;
}

export interface SnapshotRuleGroupVM {
  key: 'income' | 'expense';
  title: string;
  rows: SnapshotRuleRowVM[];
}

export interface SnapshotSourceRowVM {
  key: string;
  ruleName: string;
  /** Secondary id, empty when the source points at a rule absent from the config. */
  ruleId: string;
  sourceText: string;
  baselineYearText: string;
  baselineAmountText: string;
}

export interface SnapshotEventPhaseVM {
  rangeText: string;
  amountText: string;
  growthRateText?: string;
  /** Phase span clamped to the projection period, for the timeline bar. */
  clippedStartYear: number;
  clippedEndYear: number;
}

export interface SnapshotEventVM {
  id: string;
  name: string;
  typeText: string;
  /** Single year prints as `2028`, a span as `2028–2030`. */
  rangeText: string;
  /** Where the event sits relative to the retirement year. */
  timingText: string;
  isDisabled: boolean;
  phases: SnapshotEventPhaseVM[];
  isClipped: boolean;
  isOutside: boolean;
}

export interface ProjectionSnapshotVM {
  opening: SnapshotOpeningVM | null;
  assumptions: DefinitionItem[];
  ruleGroups: SnapshotRuleGroupVM[];
  ruleCount: number;
  events: SnapshotEventVM[];
  /** Clamped span of all events, empty when there are none. */
  eventRangeText: string;
  /** Retirement year, the timeline's anchor; null when assumptions are missing. */
  retirementYear: number | null;
  sources: SnapshotSourceRowVM[];
  /** Projection period start, the timeline's left edge. */
  startYear: number;
}

const percent = percentText;

const sourceTypeLabel = (type: string): string => {
  switch (type) {
    case 'ledgerCode':
      return PROJECTION_VIEW_LABELS.LEDGER_CODE;
    case 'rule':
      return PROJECTION_VIEW_LABELS.RULE_SOURCE;
    case 'debtAccount':
      return PROJECTION_VIEW_LABELS.DEBT_ACCOUNT;
    default:
      return type;
  }
};

const ruleTypeLabel = (type: string): string =>
  type === 'income'
    ? PROJECTION_VIEW_LABELS.RULE_TYPE_INCOME
    : PROJECTION_VIEW_LABELS.RULE_TYPE_EXPENSE;

const buildOpening = (config: ProjectionConfig | null): SnapshotOpeningVM | null =>
  config === null
    ? null
    : {
        amountText: formatCurrency(config.openingNetWorth.amount),
        sourceText:
          config.openingNetWorth.source === 'derived'
            ? PROJECTION_VIEW_LABELS.DERIVED
            : PROJECTION_VIEW_LABELS.MANUAL,
        anchorText: config.openingNetWorth.anchorYearMonth ?? null,
      };

const buildSourceRows = (
  config: ProjectionConfig | null,
  source: ProjectionSource | null,
): SnapshotSourceRowVM[] =>
  source === null
    ? []
    : source.ruleSources.map((entry, index) => {
        const rule = config?.projectionRules.find((candidate) => candidate.id === entry.ruleId);
        return {
          key: `${entry.ruleId}-${index}`,
          ruleName: rule?.name ?? entry.ruleId,
          ruleId: rule === undefined ? '' : entry.ruleId,
          sourceText: `${sourceTypeLabel(entry.sourceType)} · ${entry.sourceId}`,
          baselineYearText: String(entry.baselineYear),
          baselineAmountText: formatCurrency(entry.baselineAmount),
        };
      });

const buildAssumptionItems = (config: ProjectionConfig | null): DefinitionItem[] =>
  config === null
    ? []
    : [
        { label: PROJECTION_VIEW_LABELS.BIRTH_YEAR, value: String(config.assumptions.birthYear) },
        {
          label: PROJECTION_VIEW_LABELS.RETIREMENT_AGE,
          value: String(config.assumptions.retirementAge),
        },
        {
          label: PROJECTION_VIEW_LABELS.LIFE_EXPECTANCY,
          value: String(config.assumptions.lifeExpectancy),
        },
        {
          label: PROJECTION_VIEW_LABELS.INFLATION_RATE,
          value: percent(config.assumptions.inflationRate),
        },
        {
          label: PROJECTION_VIEW_LABELS.ANNUAL_RETURN_RATE,
          value: percent(config.assumptions.annualReturnRate),
        },
      ];

const baselineText = (rule: ProjectionRule): string => {
  const policy = rule.baselinePolicy as BaselinePolicy | undefined;
  if (policy === undefined) return PROJECTION_COMMON_LABELS.DASH;
  const label = BASELINE_POLICY_LABELS[policy];
  return rule.baselineYear === undefined ? label : `${label} ${rule.baselineYear}`;
};

/** Rules grouped by income / expense so the type label stops repeating per row. */
const buildRuleGroups = (
  config: ProjectionConfig | null,
  sources: SnapshotSourceRowVM[],
): SnapshotRuleGroupVM[] => {
  const sourceByRuleId = new Map(sources.map((entry) => [entry.ruleId, entry]));
  const rules = config?.projectionRules ?? [];
  return (['income', 'expense'] as const).flatMap((type) => {
    const rows = rules
      .filter((rule) => rule.ruleType === type)
      .map<SnapshotRuleRowVM>((rule) => {
        const source = sourceByRuleId.get(rule.id);
        return {
          id: rule.id,
          name: rule.name,
          methodText: RULE_METHOD_LABELS[rule.method],
          parametersText: parameterText(rule),
          endConditionText: endConditionText(rule),
          keepsPaceText:
            rule.keepsPaceWithInflation === true
              ? PROJECTION_COMMON_LABELS.CHECK
              : PROJECTION_COMMON_LABELS.DASH,
          baselineText: baselineText(rule),
          sourceText: source?.sourceText ?? PROJECTION_COMMON_LABELS.DASH,
          sourceBaselineText:
            source === undefined
              ? PROJECTION_COMMON_LABELS.DASH
              : `${source.baselineYearText} · ${source.baselineAmountText}`,
          isDisabled: !rule.enabled,
        };
      });
    return rows.length === 0 ? [] : [{ key: type, title: ruleTypeLabel(type), rows }];
  });
};

const spanText = (start: number | undefined, end: number | undefined): string => {
  if (start === undefined || end === undefined) return PROJECTION_COMMON_LABELS.DASH;
  return start === end ? String(start) : `${start}–${end}`;
};

const timingText = (
  firstStart: number | undefined,
  lastEnd: number | undefined,
  retirementYear: number | null,
): string => {
  if (firstStart === undefined || lastEnd === undefined || retirementYear === null) {
    return PROJECTION_COMMON_LABELS.DASH;
  }
  if (firstStart <= retirementYear && retirementYear <= lastEnd) {
    return PROJECTION_VIEW_LABELS.EVENT_RETIRING;
  }
  return lastEnd < retirementYear
    ? PROJECTION_VIEW_LABELS.EVENT_BEFORE_RETIREMENT
    : PROJECTION_VIEW_LABELS.EVENT_AFTER_RETIREMENT;
};

const buildEvents = (
  config: ProjectionConfig | null,
  axisStart: number,
  planEndYear: number,
  retirementYear: number | null,
): SnapshotEventVM[] =>
  (config?.lifeEvents ?? []).map((event) => {
    const starts = event.phases.map((phase) => phase.startYear);
    const ends = event.phases.map((phase) => phase.endYear);
    const firstStart = starts.length === 0 ? undefined : Math.min(...starts);
    const lastEnd = ends.length === 0 ? undefined : Math.max(...ends);
    const isOutside =
      firstStart !== undefined &&
      lastEnd !== undefined &&
      (lastEnd < axisStart || firstStart > planEndYear);
    const isClipped =
      !isOutside &&
      event.phases.some((phase) => phase.startYear < axisStart || phase.endYear > planEndYear);

    return {
      id: event.id,
      name: event.name,
      typeText: ruleTypeLabel(event.type),
      rangeText: spanText(firstStart, lastEnd),
      timingText: timingText(firstStart, lastEnd, retirementYear),
      isDisabled: !event.enabled,
      isClipped,
      isOutside,
      phases: event.phases.map((phase) => ({
        rangeText: spanText(phase.startYear, phase.endYear),
        amountText: formatCurrency(phase.amount),
        ...(phase.growthRate === undefined ? {} : { growthRateText: percent(phase.growthRate) }),
        clippedStartYear: Math.min(Math.max(phase.startYear, axisStart), planEndYear),
        clippedEndYear: Math.min(Math.max(phase.endYear, axisStart), planEndYear),
      })),
    };
  });

const eventRangeText = (events: SnapshotEventVM[]): string => {
  if (events.length === 0) return '';
  const span = events.flatMap((event) => event.phases);
  return `${Math.min(...span.map((phase) => phase.clippedStartYear))}–${Math.max(
    ...span.map((phase) => phase.clippedEndYear),
  )}`;
};

/** Groups the frozen snapshot into the facts, assumptions and tables the tab renders. */
export function mapProjectionSnapshotToVM(
  _projection: ProjectionDocument,
  config: ProjectionConfig | null,
  source: ProjectionSource | null,
  planEndYear: number,
): ProjectionSnapshotVM {
  const axisStart = config?.startYear ?? 0;
  const retirementYear =
    config === null ? null : config.assumptions.birthYear + config.assumptions.retirementAge;
  const events = buildEvents(config, axisStart, planEndYear, retirementYear);
  const sources = buildSourceRows(config, source);

  return {
    startYear: axisStart,
    opening: buildOpening(config),
    assumptions: buildAssumptionItems(config),
    ruleGroups: buildRuleGroups(config, sources),
    ruleCount: config?.projectionRules.length ?? 0,
    events,
    eventRangeText: eventRangeText(events),
    retirementYear,
    sources,
  };
}
