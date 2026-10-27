import { useCallback, useMemo, useRef, useState } from 'react';

import { type Resolver, type ResolverResult, useForm } from 'react-hook-form';

import { type LifeEvent, LifeEventsSchema } from '@/domains/retirement/lifeEvents';
import { type ValidationOutcome } from '@/ui/features/retirement/viewmodels/formValidation';
import {
  type EventErrorsById,
  type EventType,
  type EventsForm,
  type LifeEventDraftVM,
  LifeEventFormSchema,
  type PhaseDraftVM,
  type PhaseFocusRequest,
  blankEvent,
  blankPhase,
  collectEventErrors,
  focusTargetFor,
  mapEventDraftVMToDomain,
  mapEventToVM,
  sortPhases,
  withPhaseIndex,
} from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';

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

export function useLifeEventDrafts(markDirty: () => void) {
  const [focusRequest, setFocusRequest] = useState<PhaseFocusRequest | null>(null);
  const sequenceRef = useRef(0);

  const resolver = useCallback<Resolver<EventsForm>>((values): ResolverResult<EventsForm> => {
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
        if (!phase?.touched) continue;
        const phaseErrors = (row.phaseErrors ??= {}) as Record<number, Record<string, RHFError>>;
        const phaseRow: Record<string, RHFError> = (phaseErrors[phaseIndex] ??= {});
        phaseRow[phaseField] ??= rhfError;
        continue;
      }

      if (!event.touched) continue;
      row[kind] ??= rhfError;
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

  /** Timeline click on an empty timeline: new event that already has the range. */
  const addEventWithPhase = useCallback(
    (startYear: number, endYear: number) => {
      const phase = {
        ...blankPhase(),
        startYearText: String(startYear),
        endYearText: String(endYear),
        touched: true,
      };
      const created = { ...blankEvent(), phases: [phase], touched: true };
      commit([...form.getValues('events'), created]);
      return { eventId: created.id, phaseId: phase.id };
    },
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

  /** Timeline create: a phase already carrying the clicked range. */
  const addPhaseAt = useCallback(
    (eventId: string, startYear: number, endYear: number) => {
      let phaseId = '';
      commit(
        form.getValues('events').map((event) => {
          if (event.id !== eventId) return event;
          const phase = {
            ...blankPhase(),
            startYearText: String(startYear),
            endYearText: String(endYear),
            touched: true,
          };
          phaseId = phase.id;
          return {
            ...event,
            phases: sortPhases([...event.phases, phase]),
            touched: true,
            type: event.type,
          };
        }),
      );
      return phaseId;
    },
    [commit, form],
  );

  /** Timeline drag/resize settlement on one phase. */
  const setPhaseRange = useCallback(
    (eventId: string, phaseId: string, startYear: number, endYear: number) => {
      commit(
        form.getValues('events').map((event) =>
          event.id === eventId
            ? {
                ...event,
                phases: sortPhases(
                  event.phases.map((phase) =>
                    phase.id === phaseId
                      ? {
                          ...phase,
                          startYearText: String(startYear),
                          endYearText: String(endYear),
                          touched: true,
                        }
                      : phase,
                  ),
                ),
                touched: true,
              }
            : event,
        ),
      );
    },
    [commit, form],
  );

  /** Re-parent a phase; it adopts the target event's side. */
  const movePhase = useCallback(
    (
      fromEventId: string,
      phaseId: string,
      targetEventId: string,
      startYear: number,
      endYear: number,
    ) => {
      const current = form.getValues('events');
      const source = current.find((event) => event.id === fromEventId);
      const moving = source?.phases.find((phase) => phase.id === phaseId);
      if (moving === undefined) return;

      const moved = {
        ...moving,
        startYearText: String(startYear),
        endYearText: String(endYear),
        touched: true,
      };
      commit(
        current.map((event) => {
          if (event.id === fromEventId && fromEventId !== targetEventId) {
            return { ...event, phases: event.phases.filter((phase) => phase.id !== phaseId) };
          }
          if (event.id !== targetEventId) return event;
          const phases =
            fromEventId === targetEventId
              ? event.phases.map((phase) => (phase.id === phaseId ? moved : phase))
              : [...event.phases, moved];
          return { ...event, phases: sortPhases(phases), touched: true };
        }),
      );
    },
    [commit, form],
  );

  const snapshot = useCallback(() => form.getValues('events'), [form]);

  const replaceDrafts = useCallback(
    (next: LifeEventDraftVM[]) => commit(next.map(withPhaseIndex)),
    [commit],
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
      form.reset({ events: next.map((event) => withPhaseIndex(mapEventToVM(event))) });
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
    valid: Object.keys(collectEventErrors(events)).length === 0,
    focusRequest,
    revealAll,
    add,
    remove,
    toggle,
    update,
    setType,
    addPhase,
    addPhaseAt,
    addEventWithPhase,
    setPhaseRange,
    movePhase,
    snapshot,
    replaceDrafts,
    removePhase,
    updatePhase,
    validate,
    replaceAll,
  };
}
