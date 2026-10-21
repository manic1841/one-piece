import { z } from 'zod';

import { RetirementSchemaErrorCode } from '@/domains/retirement/errorCodes';
import { type LifeEvent, LifeEventSchema } from '@/domains/retirement/lifeEvents';
import { newId } from '@/shared/id';
import { ASSUMPTION_LABELS } from '@/ui/constants/retirement-redesign/setupLabels';
import { RETIREMENT_VALIDATION_LABELS } from '@/ui/constants/retirement/retirementValidationLabels';

import { decimalToPercentText, percentToDecimal } from './assumptionForm.vm';

export type EventType = LifeEvent['type'];
export type PhaseErrorField = 'name' | 'startYear' | 'endYear' | 'amount' | 'growthRate';
export type EventErrorField = 'name' | 'type' | 'phases';

export const PhaseDraftFormSchema = z.object({
  id: z.string(),
  name: z.string(),
  startYearText: z.string(),
  endYearText: z.string(),
  amountText: z.string(),
  growthRateText: z.string(),
  touched: z.boolean(),
});

export type PhaseDraftVM = z.infer<typeof PhaseDraftFormSchema>;

export const LifeEventDraftFormSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['income', 'expense']),
  enabled: z.boolean(),
  phases: z.array(PhaseDraftFormSchema),
  /** Mirror keyed by phase id so form field names stay stable while phases sort. */
  phasesById: z.record(z.string(), PhaseDraftFormSchema).optional(),
  touched: z.boolean(),
});

export type LifeEventDraftVM = z.infer<typeof LifeEventDraftFormSchema>;

export type PhaseErrors = Partial<Record<PhaseErrorField, string>>;

export interface EventErrors {
  name?: string;
  type?: string;
  phases?: string;
  phaseErrors?: Record<string, PhaseErrors>;
}

export type EventErrorsById = Record<string, EventErrors>;

export const EventsFormSchema = z.object({ events: z.array(LifeEventDraftFormSchema) });

export type EventsForm = z.infer<typeof EventsFormSchema>;

/** An identifier and field the phase row should focus after a cross-phase fix. */
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

/** VM -> domain payload. Unknown keys stay permissive for the domain parse. */
export function mapEventDraftVMToDomain(event: LifeEventDraftVM): unknown {
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

/** Keeps the id-keyed phase mirror in sync so form field names stay stable. */
export function withPhaseIndex(event: LifeEventDraftVM): LifeEventDraftVM {
  return {
    ...event,
    phasesById: Object.fromEntries(event.phases.map((phase) => [phase.id, phase])),
  };
}

export function mapEventToVM(event: LifeEvent): LifeEventDraftVM {
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
  const parsed = LifeEventSchema.safeParse(mapEventDraftVMToDomain(event));
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

function applyIssues(
  errors: EventErrors,
  event: LifeEventDraftVM,
  issues: { message: string; path: PropertyKey[] }[],
): void {
  for (const issue of issues) {
    const mapped = mapIssue(issue, event.phases);
    if (mapped !== null) applyMappedIssue(errors, event, mapped);
  }
}

/** Per-event errors keyed by event id; fields carry display labels. */
export function collectEventErrors(events: LifeEventDraftVM[]): EventErrorsById {
  const errors: EventErrorsById = {};

  for (const event of events) {
    const eventErrors: EventErrors = {};
    const parsed = LifeEventSchema.safeParse(mapEventDraftVMToDomain(event));

    if (!parsed.success) applyIssues(eventErrors, event, parsed.error.issues);
    applyIssues(eventErrors, event, crossPhaseIssues(event));

    if (Object.keys(eventErrors).length > 0) errors[event.id] = eventErrors;
  }

  return errors;
}

/**
 * Form VM gate. Semantic rules stay in the domain schema; the refinement only
 * re-attributes their issues to form paths so the resolver and the submit gate
 * share one parse.
 */
function addEventIssues(
  ctx: z.RefinementCtx,
  index: number,
  event: LifeEventDraftVM,
  errors: EventErrors,
): void {
  for (const field of ['name', 'type', 'phases'] as const) {
    const message = errors[field];
    if (message !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, field], message });
    }
  }

  for (const [phaseIndex, phase] of event.phases.entries()) {
    const phaseErrors = errors.phaseErrors?.[phase.id];
    if (phaseErrors === undefined) continue;
    for (const [field, message] of Object.entries(phaseErrors)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'phases', phaseIndex, field],
        message,
      });
    }
  }
}

export const LifeEventFormSchema = EventsFormSchema.superRefine((value, ctx) => {
  const errors = collectEventErrors(value.events);

  for (const [index, event] of value.events.entries()) {
    const eventErrors = errors[event.id];
    if (eventErrors !== undefined) addEventIssues(ctx, index, event, eventErrors);
  }
});
