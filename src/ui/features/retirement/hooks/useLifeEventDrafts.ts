import { useCallback, useMemo, useRef, useState } from 'react';

import { type Resolver, type ResolverResult, useForm } from 'react-hook-form';

import { type LifeEvent, LifeEventsSchema } from '@/domains/retirement/lifeEvents';
import { EVENT_LABELS } from '@/ui/constants/retirement/eventLabels';
import {
  nextDefaultName,
  useLifeEventPhases,
} from '@/ui/features/retirement/hooks/useLifeEventPhases';
import { type ValidationOutcome } from '@/ui/features/retirement/viewmodels/formValidation';
import {
  type EventErrorsById,
  type EventType,
  type EventsForm,
  type LifeEventDraftVM,
  LifeEventFormSchema,
  type PhaseFocusRequest,
  blankEvent,
  blankPhase,
  collectEventErrors,
  mapEventDraftVMToDomain,
  mapEventToVM,
  mirrorEventsForm,
  sortEvents,
} from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';
import { type PlanDraftGroupArgs } from '@/ui/features/retirement/viewmodels/planForm.vm';

export type {
  EventErrorField,
  EventErrors,
  EventErrorsById,
  EventType,
  LifeEventDraftVM,
  PhaseDraftVM,
  PhaseErrorField,
  PhaseErrors,
  PhaseFocusRequest,
} from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';

interface RHFError {
  type: string;
  message: string;
}

export function useLifeEventDrafts({ revealed, onEdit }: PlanDraftGroupArgs) {
  const [focusRequest, setFocusRequest] = useState<PhaseFocusRequest | null>(null);
  const sequenceRef = useRef(0);

  const resolver = useCallback<Resolver<EventsForm>>(
    (values): ResolverResult<EventsForm> => {
      const parsed = LifeEventFormSchema.safeParse(values);
      if (parsed.success) return { values, errors: {} };

      const fieldErrors: Record<number, Record<string, unknown>> = {};
      for (const issue of parsed.error.issues) {
        const [index, kind, phaseIndex, phaseField] = issue.path;
        if (typeof index !== 'number' || typeof kind !== 'string') continue;

        const event = values.events[index];
        if (event === undefined) continue;
        const row: Record<string, unknown> = (fieldErrors[index] ??= {});
        const rhfError: RHFError = { type: 'validation', message: issue.message };

        if (kind === 'phases' && typeof phaseIndex === 'number' && typeof phaseField === 'string') {
          const phase = event.phases[phaseIndex];
          if (!phase?.touched && !revealed) continue;
          const phaseErrors = (row.phaseErrors ??= {}) as Record<number, Record<string, RHFError>>;
          const phaseRow: Record<string, RHFError> = (phaseErrors[phaseIndex] ??= {});
          phaseRow[phaseField] ??= rhfError;
          continue;
        }

        if (!event.touched && !revealed) continue;
        row[kind] ??= rhfError;
      }

      if (Object.keys(fieldErrors).length === 0) return { values, errors: {} };
      return { values, errors: { events: fieldErrors } } as unknown as ResolverResult<EventsForm>;
    },
    [revealed],
  );

  const form = useForm<EventsForm>({
    mode: 'onTouched',
    defaultValues: { events: [], eventsById: {} },
    resolver,
  });
  const events = form.watch('events');
  /**
   * Authoritative drafts. RHF keeps a value mirror for validation, but a field
   * whose ref is not an `<input>` (the type select) unsets its own path on
   * register, so mutations read this instead of `getValues`.
   */
  const latest = useRef<LifeEventDraftVM[]>([]);

  const commit = useCallback(
    (next: LifeEventDraftVM[]) => {
      latest.current = next;
      form.reset(mirrorEventsForm(next) as never);
      onEdit();
    },
    [form, onEdit],
  );

  const requestFocus = useCallback((request: PhaseFocusRequest | null) => {
    if (request === null) return;
    sequenceRef.current += 1;
    setFocusRequest({ ...request, sequence: sequenceRef.current });
  }, []);

  const phases = useLifeEventPhases({ latest, commit, requestFocus });

  const update = useCallback(
    (id: string, patch: Partial<Omit<LifeEventDraftVM, 'phases'>>) => {
      commit(
        latest.current.map((event) =>
          event.id === id ? { ...event, ...patch, touched: true } : event,
        ),
      );
    },
    [commit],
  );

  /** Empty-state / header create: a new event that already has a one-year phase. */
  const addEventWithPhase = useCallback(
    (startYear: number, endYear: number) => {
      const phase = {
        ...blankPhase(),
        name: nextDefaultName([], EVENT_LABELS.PHASE_NAME_PREFIX),
        startYearText: String(startYear),
        endYearText: String(endYear),
      };
      const created = {
        ...blankEvent(),
        name: nextDefaultName(
          latest.current.map((event) => event.name),
          EVENT_LABELS.EVENT_NAME_PREFIX,
        ),
        phases: [phase],
      };
      commit(sortEvents([...latest.current, created]));
      return { eventId: created.id, phaseId: phase.id };
    },
    [commit],
  );

  const remove = useCallback(
    (id: string) => commit(latest.current.filter((event) => event.id !== id)),
    [commit],
  );

  const toggle = useCallback(
    (id: string) => {
      commit(
        latest.current.map((event) =>
          event.id === id ? { ...event, enabled: !event.enabled, touched: true } : event,
        ),
      );
    },
    [commit],
  );

  const setType = useCallback(
    (id: string, type: EventType) => {
      commit(
        latest.current.map((event) =>
          event.id === id ? { ...event, type, touched: true } : event,
        ),
      );
    },
    [commit],
  );

  const snapshot = useCallback(() => latest.current, []);

  const replaceDrafts = useCallback((next: LifeEventDraftVM[]) => commit(next), [commit]);

  const validate = useCallback((): ValidationOutcome<LifeEvent[], EventErrorsById> => {
    const current = latest.current;
    const errors = collectEventErrors(current);
    const all = LifeEventsSchema.safeParse(current.map(mapEventDraftVMToDomain));
    void form.trigger();

    return {
      ok: Object.keys(errors).length === 0 && all.success,
      data: all.success ? all.data : undefined,
      errors,
    };
  }, [form]);

  const visibleErrors = useMemo(() => {
    const all = collectEventErrors(events);
    const visible: EventErrorsById = {};
    for (const event of events) {
      const errors = all[event.id];
      if (errors === undefined) continue;

      if (revealed || event.touched) visible[event.id] = { ...errors };

      for (const phase of event.phases) {
        const phaseErrors = errors.phaseErrors?.[phase.id];
        if ((!phase.touched && !revealed) || phaseErrors === undefined) continue;
        visible[event.id] = {
          ...visible[event.id],
          phaseErrors: { ...visible[event.id]?.phaseErrors, [phase.id]: phaseErrors },
        };
      }
    }
    return visible;
  }, [events, revealed]);

  const replaceAll = useCallback(
    (next: LifeEvent[]) => {
      const drafts = next.map(mapEventToVM);
      latest.current = drafts;
      form.reset(mirrorEventsForm(drafts) as never);
    },
    [form],
  );

  return {
    form,
    events,
    errors: visibleErrors,
    valid: Object.keys(collectEventErrors(events)).length === 0,
    focusRequest,
    remove,
    toggle,
    update,
    setType,
    ...phases,
    addEventWithPhase,
    snapshot,
    replaceDrafts,
    validate,
    replaceAll,
  };
}
