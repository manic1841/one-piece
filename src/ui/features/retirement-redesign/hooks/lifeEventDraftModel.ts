import { RetirementSchemaErrorCode } from '@/domains/retirement/errorCodes';
import { type LifeEvent, LifeEventSchema } from '@/domains/retirement/lifeEvents';
import { newId } from '@/shared/id';
import { ASSUMPTION_LABELS } from '@/ui/constants/retirement-redesign/setupLabels';
import { RETIREMENT_VALIDATION_LABELS } from '@/ui/constants/retirement/retirementValidationLabels';
import {
  decimalToPercentText,
  percentToDecimal,
} from '@/ui/features/retirement-redesign/hooks/useAssumptionDraft';

export type EventType = LifeEvent['type'];
export type PhaseErrorField = 'name' | 'startYear' | 'endYear' | 'amount' | 'growthRate';
export type EventErrorField = 'name' | 'type' | 'phases';

export interface PhaseDraftVM {
  id: string;
  name: string;
  startYearText: string;
  endYearText: string;
  amountText: string;
  growthRateText: string;
  touched: boolean;
}

export interface LifeEventDraftVM {
  id: string;
  name: string;
  type: EventType;
  enabled: boolean;
  phases: PhaseDraftVM[];
  /** Mirror keyed by phase id so form field names stay stable while phases sort. */
  phasesById?: Record<string, PhaseDraftVM>;
  touched: boolean;
}

export type PhaseErrors = Partial<Record<PhaseErrorField, string>>;

export interface EventErrors {
  name?: string;
  type?: string;
  phases?: string;
  phaseErrors?: Record<string, PhaseErrors>;
}

export type EventErrorsById = Record<string, EventErrors>;

export interface PhaseFocusRequest {
  eventId: string;
  phaseId: string;
  field: PhaseErrorField;
  sequence: number;
}

export function blankPhase(): PhaseDraftVM {
  return {
    id: newId(),
    name: '',
    startYearText: '',
    endYearText: '',
    amountText: '',
    growthRateText: '',
    touched: false,
  };
}

export function blankEvent(): LifeEventDraftVM {
  return {
    id: newId(),
    name: '',
    type: 'income',
    enabled: true,
    phases: [blankPhase()],
    touched: false,
  };
}

function parseNumber(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text);
}

function parseGrowthRate(text: string): number {
  return text.trim() === '' ? Number.NaN : percentToDecimal(text);
}

function labelFor(message: string): string {
  return (
    RETIREMENT_VALIDATION_LABELS[message as RetirementSchemaErrorCode] ??
    ASSUMPTION_LABELS.INVALID_NUMBER
  );
}

/** Stable ascending order; blank or unparsable starts sink to the end. */
export function sortPhases(phases: PhaseDraftVM[]): PhaseDraftVM[] {
  return [...phases].sort((left, right) => {
    const leftYear = parseNumber(left?.startYearText ?? '');
    const rightYear = parseNumber(right?.startYearText ?? '');
    if (Number.isNaN(leftYear) && Number.isNaN(rightYear)) return 0;
    if (Number.isNaN(leftYear)) return 1;
    if (Number.isNaN(rightYear)) return -1;
    return leftYear - rightYear;
  });
}

export function buildEvent(event: LifeEventDraftVM): unknown {
  return {
    id: event.id,
    name: event.name,
    type: event.type,
    enabled: event.enabled,
    phases: event.phases.map((phase) => ({
      ...((phase?.name ?? '').trim() === '' ? {} : { name: phase.name }),
      startYear: parseNumber(phase?.startYearText ?? ''),
      endYear: parseNumber(phase?.endYearText ?? ''),
      amount: parseNumber(phase?.amountText ?? ''),
      ...((phase?.growthRateText ?? '').trim() === ''
        ? {}
        : { growthRate: parseGrowthRate(phase.growthRateText) }),
    })),
  };
}

const PHASE_FIELD: Record<string, PhaseErrorField> = {
  name: 'name',
  startYear: 'startYear',
  endYear: 'endYear',
  amount: 'amount',
  growthRate: 'growthRate',
};

interface MappedIssue {
  eventField?: EventErrorField;
  phaseIndex?: number;
  phaseField?: PhaseErrorField;
  label: string;
}

function mapIssue(
  issue: { message: string; path: PropertyKey[] },
  phases: PhaseDraftVM[],
): MappedIssue | null {
  const label = labelFor(issue.message);
  const [head, second, third] = issue.path;

  if (head === 'name' || head === 'type') return { eventField: head, label };
  if (head === 'phases') {
    if (typeof second !== 'number') return { eventField: 'phases', label };
    const phaseField = typeof third === 'string' ? PHASE_FIELD[third] : undefined;
    return phaseField === undefined
      ? { phaseIndex: second, label }
      : { phaseIndex: second, phaseField, label };
  }

  // Refinements on the event attach issues straight on the phase index.
  if (typeof head === 'number') {
    if (phases[head] === undefined) return null;
    const phaseField = typeof second === 'string' ? PHASE_FIELD[second] : undefined;
    return phaseField === undefined
      ? { phaseIndex: head, label }
      : { phaseIndex: head, phaseField, label };
  }

  return null;
}

function applyMappedIssue(errors: EventErrors, event: LifeEventDraftVM, mapped: MappedIssue): void {
  if (mapped.phaseField !== undefined && mapped.phaseIndex !== undefined) {
    const phase = event.phases[mapped.phaseIndex];
    if (phase === undefined) return;
    errors.phaseErrors = {
      ...errors.phaseErrors,
      [phase.id]: { ...errors.phaseErrors?.[phase.id], [mapped.phaseField]: mapped.label },
    };
    return;
  }
  if (mapped.eventField !== undefined && errors[mapped.eventField] === undefined) {
    errors[mapped.eventField] = mapped.label;
  }
}

/**
 * Zod skips the event-level refinement while any phase field is invalid, so
 * overlap/sort are re-checked through the same schema with only the irrelevant
 * fields normalized (years must all be valid; amounts and names are neutral).
 */
function crossPhaseIssues(event: LifeEventDraftVM) {
  const phases = event.phases.map((phase) => ({
    startYear: parseNumber(phase?.startYearText ?? ''),
    endYear: parseNumber(phase?.endYearText ?? ''),
  }));
  if (
    !phases.every((phase) => Number.isInteger(phase.startYear) && Number.isInteger(phase.endYear))
  ) {
    return [];
  }

  const parsed = LifeEventSchema.safeParse({
    id: event.id || 'cross-check',
    name: 'cross-check',
    type: 'income',
    enabled: true,
    phases: phases.map((phase) => ({ ...phase, amount: 0 })),
  });
  if (parsed.success) return [];

  return parsed.error.issues.filter(
    (issue) =>
      issue.message === RetirementSchemaErrorCode.PHASES_OVERLAP ||
      issue.message === RetirementSchemaErrorCode.PHASE_END_BEFORE_START ||
      issue.message === RetirementSchemaErrorCode.PHASES_NOT_SORTED,
  );
}

/** The offending phase field for the two cross-phase failures. */
export function focusTargetFor(event: LifeEventDraftVM): PhaseFocusRequest | null {
  const parsed = LifeEventSchema.safeParse(buildEvent(event));
  const issues = [...(parsed.success ? [] : parsed.error.issues), ...crossPhaseIssues(event)];

  for (const issue of issues) {
    if (
      issue.message !== RetirementSchemaErrorCode.PHASES_OVERLAP &&
      issue.message !== RetirementSchemaErrorCode.PHASE_END_BEFORE_START &&
      issue.message !== RetirementSchemaErrorCode.PHASES_NOT_SORTED
    ) {
      continue;
    }

    const index = typeof issue.path[0] === 'number' ? issue.path[0] : Number(issue.path[1]);
    const phase = event.phases[index];
    if (phase === undefined) continue;
    return {
      eventId: event.id,
      phaseId: phase.id,
      field:
        issue.message === RetirementSchemaErrorCode.PHASE_END_BEFORE_START
          ? 'endYear'
          : 'startYear',
      sequence: 0,
    };
  }

  return null;
}

export function eventFromDomain(event: LifeEvent): LifeEventDraftVM {
  return {
    id: event.id,
    name: event.name,
    type: event.type,
    enabled: event.enabled,
    phases: event.phases.map((phase) => ({
      id: newId(),
      name: phase.name ?? '',
      startYearText: String(phase.startYear),
      endYearText: String(phase.endYear),
      amountText: String(phase.amount),
      growthRateText: phase.growthRate === undefined ? '' : decimalToPercentText(phase.growthRate),
      touched: false,
    })),
    touched: false,
  };
}

export function validateEventDraft(event: LifeEventDraftVM): EventErrors {
  const errors: EventErrors = {};
  const parsed = LifeEventSchema.safeParse(buildEvent(event));

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const mapped = mapIssue(issue, event.phases);
      if (mapped !== null) applyMappedIssue(errors, event, mapped);
    }
  }

  for (const issue of crossPhaseIssues(event)) {
    const mapped = mapIssue(issue, event.phases);
    if (mapped !== null) applyMappedIssue(errors, event, mapped);
  }

  return errors;
}
