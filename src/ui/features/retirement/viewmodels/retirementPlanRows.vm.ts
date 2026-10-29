import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { RULE_LABELS } from '@/ui/constants/retirement/setupLabels';
import { percentText } from '@/ui/features/retirement/viewmodels/projectionRows.vm';
import { formatCurrency } from '@/ui/utils';

/**
 * Sentence fragments shared by every surface that names a rule in prose: the
 * plan narrative here and the workspace rule row. They live beside the sentence
 * builder so the grammar has one home, not one per surface.
 */
export const RULE_SENTENCE = {
  OF: 'of',
  PER_YEAR: '/ year',
  FOLLOWS_INFLATION: 'follows inflation',
  ANNUAL_GROWTH: 'annual growth',
  LOAN_SCHEDULE: 'follows loan schedule',
  UNTIL_RETIREMENT: 'until retirement',
  LIFELONG: 'for life',
  THROUGH_AGE: (age: string) => `through age ${age}`,
  THROUGH_YEAR: (year: string) => `through ${year}`,
} as const;

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

/** The window an event axis spans; the timeline reads its markers off it. */
export interface EventAxis {
  startYear: number;
  endYear: number;
  retirementYear: number | null;
}

/**
 * The words an event row needs from its caller. The plan narrative reads in
 * page chrome, the projection snapshot reads with the other report tables, so
 * the wording stays the caller's even though the row's shape does not.
 */
export interface EventVocabulary {
  retiring: string;
  before: string;
  after: string;
  income: string;
  expense: string;
}

/** Source names resolved by the caller; unknown ids fall back to the raw id. */
export type SourceResolver = (source: { type: string; id: string }) => string;

/**
 * One end condition as the tail of a rule sentence. The fragments carry their
 * own preposition, so the condition reads as a phrase rather than a bare value.
 */
function endOfSentence(rule: ProjectionRule): string {
  if (rule.endCondition === undefined) return PROJECTION_COMMON_LABELS.DASH;
  switch (rule.endCondition.type) {
    case 'retirementYearExclusive':
      return RULE_SENTENCE.UNTIL_RETIREMENT;
    case 'specificAge':
      return RULE_SENTENCE.THROUGH_AGE(String(rule.endCondition.age));
    case 'specificYear':
      return RULE_SENTENCE.THROUGH_YEAR(String(rule.endCondition.year));
    case 'lifelong':
      return RULE_SENTENCE.LIFELONG;
  }
}

/**
 * The rule as a sentence: how it grows, from where, and until when. A source
 * that repeats the rule's own name is dropped, it adds nothing.
 */
export function buildRuleSentence(rule: ProjectionRule, resolveSource: SourceResolver): string {
  const source = rule.source === undefined ? RULE_LABELS.NO_SOURCE : resolveSource(rule.source);
  const namedSource = source === rule.name ? null : source;

  const behavior = (() => {
    switch (rule.method) {
      case 'inflation':
        return [RULE_SENTENCE.FOLLOWS_INFLATION, namedSource]
          .filter((part) => part !== null)
          .join(' · ');
      case 'growthRate':
        return 'rate' in rule.parameters
          ? [`${percentText(rule.parameters.rate)} ${RULE_SENTENCE.ANNUAL_GROWTH}`, namedSource]
              .filter((part) => part !== null)
              .join(' · ')
          : source;
      case 'percentage':
        return 'ratio' in rule.parameters
          ? `${percentText(rule.parameters.ratio)} ${RULE_SENTENCE.OF} ${source}`
          : source;
      case 'fixedAmount':
        return 'amount' in rule.parameters
          ? `${formatCurrency(rule.parameters.amount)} ${RULE_SENTENCE.PER_YEAR}`
          : PROJECTION_COMMON_LABELS.DASH;
      case 'debtAmortization':
        return `${source} · ${RULE_SENTENCE.LOAN_SCHEDULE}`;
    }
  })();

  return [
    behavior,
    // An inflation method already says it; only the other methods need the flag spelled out.
    ...(rule.keepsPaceWithInflation === true && rule.method !== 'inflation'
      ? [RULE_SENTENCE.FOLLOWS_INFLATION]
      : []),
    endOfSentence(rule),
  ]
    .filter((part) => part !== PROJECTION_COMMON_LABELS.DASH)
    .join(' · ');
}

const spanText = (start: number | undefined, end: number | undefined): string => {
  if (start === undefined || end === undefined) return PROJECTION_COMMON_LABELS.DASH;
  return start === end ? String(start) : `${start}–${end}`;
};

function timingText(
  firstStart: number | undefined,
  lastEnd: number | undefined,
  retirementYear: number | null,
  vocabulary: EventVocabulary,
): string {
  if (firstStart === undefined || lastEnd === undefined || retirementYear === null) {
    return PROJECTION_COMMON_LABELS.DASH;
  }
  if (firstStart <= retirementYear && retirementYear <= lastEnd) return vocabulary.retiring;
  return lastEnd < retirementYear ? vocabulary.before : vocabulary.after;
}

/**
 * Event rows for a read-only timeline: one row per event, phases clamped to the
 * axis. An event entirely off the axis keeps its row but is flagged `isOutside`
 * so the timeline can drop its bar instead of drawing a sliver at the edge.
 */
export function buildEventRows(
  events: LifeEvent[],
  axis: EventAxis,
  vocabulary: EventVocabulary,
): SnapshotEventVM[] {
  return events.map((event) => {
    const starts = event.phases.map((phase) => phase.startYear);
    const ends = event.phases.map((phase) => phase.endYear);
    const firstStart = starts.length === 0 ? undefined : Math.min(...starts);
    const lastEnd = ends.length === 0 ? undefined : Math.max(...ends);
    const isOutside =
      firstStart !== undefined &&
      lastEnd !== undefined &&
      (lastEnd < axis.startYear || firstStart > axis.endYear);
    const isClipped =
      !isOutside &&
      event.phases.some(
        (phase) => phase.startYear < axis.startYear || phase.endYear > axis.endYear,
      );

    return {
      id: event.id,
      name: event.name,
      typeText: event.type === 'income' ? vocabulary.income : vocabulary.expense,
      rangeText: spanText(firstStart, lastEnd),
      timingText: timingText(firstStart, lastEnd, axis.retirementYear, vocabulary),
      isDisabled: !event.enabled,
      isClipped,
      isOutside,
      phases: event.phases.map((phase) => ({
        rangeText: spanText(phase.startYear, phase.endYear),
        amountText: formatCurrency(phase.amount),
        ...(phase.growthRate === undefined
          ? {}
          : { growthRateText: percentText(phase.growthRate) }),
        clippedStartYear: Math.min(Math.max(phase.startYear, axis.startYear), axis.endYear),
        clippedEndYear: Math.min(Math.max(phase.endYear, axis.startYear), axis.endYear),
      })),
    };
  });
}
