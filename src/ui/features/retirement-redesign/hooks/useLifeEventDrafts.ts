import { useCallback, useMemo, useRef, useState } from 'react';

import { type Resolver, type ResolverResult, useForm } from 'react-hook-form';

import { type LifeEvent, LifeEventsSchema } from '@/domains/retirement/lifeEvents';
import {
  type EventErrorsById,
  type EventType,
  type LifeEventDraftVM,
  type PhaseDraftVM,
  type PhaseFocusRequest,
  blankEvent,
  blankPhase,
  buildEvent,
  eventFromDomain,
  focusTargetFor,
  sortPhases,
  validateEventDraft,
} from '@/ui/features/retirement-redesign/hooks/lifeEventDraftModel';
import { type ValidationOutcome } from '@/ui/features/retirement-redesign/hooks/useAssumptionDraft';

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
} from '@/ui/features/retirement-redesign/hooks/lifeEventDraftModel';

export interface EventsForm {
  events: LifeEventDraftVM[];
}

function withPhaseIndex(event: LifeEventDraftVM): LifeEventDraftVM {
  return {
    ...event,
    phasesById: Object.fromEntries(event.phases.map((phase) => [phase.id, phase])),
  };
}

function buildErrors(events: LifeEventDraftVM[]): EventErrorsById {
  const errors: EventErrorsById = {};
  for (const event of events) {
    const eventErrors = validateEventDraft(event);
    if (Object.keys(eventErrors).length > 0) errors[event.id] = eventErrors;
  }
  return errors;
}

export function useLifeEventDrafts(markDirty: () => void) {
  const [focusRequest, setFocusRequest] = useState<PhaseFocusRequest | null>(null);
  const sequenceRef = useRef(0);

  const resolver = useCallback<Resolver<EventsForm>>((values): ResolverResult<EventsForm> => {
    const errors = buildErrors(values.events);
    const fieldErrors: Record<string, unknown> = {};

    for (const [index, event] of values.events.entries()) {
      const eventErrors = errors[event.id];
      if (eventErrors === undefined) continue;

      const row: Record<string, unknown> = {};
      if (event.touched) {
        if (eventErrors.name) row.name = { type: 'validation', message: eventErrors.name };
        if (eventErrors.type) row.type = { type: 'validation', message: eventErrors.type };
        if (eventErrors.phases) row.phases = { type: 'validation', message: eventErrors.phases };
      }

      const phaseErrors: Record<number, unknown> = {};
      for (const [phaseIndex, phase] of event.phases.entries()) {
        if (!phase.touched) continue;
        const phaseError = eventErrors.phaseErrors?.[phase.id];
        if (phaseError === undefined) continue;
        phaseErrors[phaseIndex] = Object.fromEntries(
          Object.entries(phaseError).map(([field, message]) => [
            field,
            { type: 'validation', message },
          ]),
        );
      }
      if (Object.keys(phaseErrors).length > 0) row.phaseErrors = phaseErrors;

      if (Object.keys(row).length > 0) fieldErrors[index] = row;
    }

    if (Object.keys(fieldErrors).length === 0) return { values, errors: {} };
    return { values, errors: { events: fieldErrors } } as unknown as ResolverResult<EventsForm>;
  }, []);

  const form = useForm<EventsForm>({ mode: 'onTouched', defaultValues: { events: [] }, resolver });
  const events = form.watch('events');

  const commit = useCallback(
    (next: LifeEventDraftVM[]) => {
      form.reset({ events: next.map(withPhaseIndex) } as never);
      markDirty();
    },
    [form, markDirty],
  );

  const requestFocus = useCallback((request: PhaseFocusRequest | null) => {
    if (request === null) return;
    sequenceRef.current += 1;
    setFocusRequest({ ...request, sequence: sequenceRef.current });
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Omit<LifeEventDraftVM, 'phases'>>) => {
      commit(
        form
          .getValues('events')
          .map((event) => (event.id === id ? { ...event, ...patch, touched: true } : event)),
      );
    },
    [commit, form],
  );

  const add = useCallback(
    () => commit([...form.getValues('events'), blankEvent()]),
    [commit, form],
  );

  const remove = useCallback(
    (id: string) => commit(form.getValues('events').filter((event) => event.id !== id)),
    [commit, form],
  );

  const toggle = useCallback(
    (id: string) => {
      commit(
        form
          .getValues('events')
          .map((event) =>
            event.id === id ? { ...event, enabled: !event.enabled, touched: true } : event,
          ),
      );
    },
    [commit, form],
  );

  const setType = useCallback(
    (id: string, type: EventType) => {
      commit(
        form
          .getValues('events')
          .map((event) => (event.id === id ? { ...event, type, touched: true } : event)),
      );
    },
    [commit, form],
  );

  const addPhase = useCallback(
    (eventId: string) => {
      commit(
        form
          .getValues('events')
          .map((event) =>
            event.id === eventId
              ? { ...event, phases: [...event.phases, blankPhase()], touched: true }
              : event,
          ),
      );
    },
    [commit, form],
  );

  const removePhase = useCallback(
    (eventId: string, phaseId: string) => {
      commit(
        form.getValues('events').map((event) =>
          event.id === eventId
            ? {
                ...event,
                phases: event.phases.filter((phase) => phase.id !== phaseId),
                touched: true,
              }
            : event,
        ),
      );
    },
    [commit, form],
  );

  const updatePhase = useCallback(
    (eventId: string, phaseId: string, patch: Partial<PhaseDraftVM>) => {
      let focus: PhaseFocusRequest | null = null;
      const next = form.getValues('events').map((event) => {
        if (event.id !== eventId) return event;

        const phases = sortPhases(
          event.phases.map((phase) =>
            phase.id === phaseId ? { ...phase, ...patch, touched: true } : phase,
          ),
        );
        const updated = { ...event, phases, touched: true };

        if (patch.startYearText !== undefined || patch.endYearText !== undefined) {
          focus = focusTargetFor(updated);
        }
        return updated;
      });

      commit(next);
      if (focus !== null) requestFocus(focus);
    },
    [commit, form, requestFocus],
  );

  const validate = useCallback((): ValidationOutcome<LifeEvent[], EventErrorsById> => {
    const current = form.getValues('events');
    const errors = buildErrors(current);
    const built = current.map(buildEvent);
    const all = LifeEventsSchema.safeParse(built);
    void form.trigger();

    return {
      ok: Object.keys(errors).length === 0 && all.success,
      data: all.success ? all.data : undefined,
      errors,
    };
  }, [form]);

  const visibleErrors = useMemo(() => {
    const all = buildErrors(events);
    const visible: EventErrorsById = {};
    for (const event of events) {
      const errors = all[event.id];
      if (errors === undefined) continue;

      if (event.touched) visible[event.id] = { ...errors };

      for (const phase of event.phases) {
        const phaseErrors = errors.phaseErrors?.[phase.id];
        if (!phase.touched || phaseErrors === undefined) continue;
        visible[event.id] = {
          ...visible[event.id],
          phaseErrors: { ...visible[event.id]?.phaseErrors, [phase.id]: phaseErrors },
        };
      }
    }
    return visible;
  }, [events]);

  const replaceAll = useCallback(
    (next: LifeEvent[]) => {
      form.reset({ events: next.map((event) => withPhaseIndex(eventFromDomain(event))) });
    },
    [form],
  );

  /** CALCULATE reveals every event and phase error. */
  const revealAll = useCallback(() => {
    form.setValue(
      'events',
      form.getValues('events').map((event) => ({
        ...event,
        touched: true,
        phases: event.phases.map((phase) => ({ ...phase, touched: true })),
      })),
      { shouldDirty: true, shouldTouch: true },
    );
    void form.trigger();
  }, [form]);

  return {
    form,
    events,
    errors: visibleErrors,
    valid: Object.keys(buildErrors(events)).length === 0,
    focusRequest,
    revealAll,
    add,
    remove,
    toggle,
    update,
    setType,
    addPhase,
    removePhase,
    updatePhase,
    validate,
    replaceAll,
  };
}
