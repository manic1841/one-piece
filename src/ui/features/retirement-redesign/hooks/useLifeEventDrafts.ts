import { useCallback, useMemo, useRef, useState } from 'react';

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

export function useLifeEventDrafts(markDirty: () => void) {
  const [events, setEvents] = useState<LifeEventDraftVM[]>([]);
  const [focusRequest, setFocusRequest] = useState<PhaseFocusRequest | null>(null);
  const sequenceRef = useRef(0);

  const requestFocus = useCallback((request: PhaseFocusRequest | null) => {
    if (request === null) return;
    sequenceRef.current += 1;
    setFocusRequest({ ...request, sequence: sequenceRef.current });
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Omit<LifeEventDraftVM, 'phases'>>) => {
      setEvents((current) =>
        current.map((event) => (event.id === id ? { ...event, ...patch, touched: true } : event)),
      );
      markDirty();
    },
    [markDirty],
  );

  const add = useCallback(() => {
    setEvents((current) => [...current, blankEvent()]);
    markDirty();
  }, [markDirty]);

  const remove = useCallback(
    (id: string) => {
      setEvents((current) => current.filter((event) => event.id !== id));
      markDirty();
    },
    [markDirty],
  );

  const toggle = useCallback(
    (id: string) => {
      setEvents((current) =>
        current.map((event) =>
          event.id === id ? { ...event, enabled: !event.enabled, touched: true } : event,
        ),
      );
      markDirty();
    },
    [markDirty],
  );

  const setType = useCallback(
    (id: string, type: EventType) => {
      setEvents((current) =>
        current.map((event) => (event.id === id ? { ...event, type, touched: true } : event)),
      );
      markDirty();
    },
    [markDirty],
  );

  const addPhase = useCallback(
    (eventId: string) => {
      setEvents((current) =>
        current.map((event) =>
          event.id === eventId
            ? { ...event, phases: [...event.phases, blankPhase()], touched: true }
            : event,
        ),
      );
      markDirty();
    },
    [markDirty],
  );

  const removePhase = useCallback(
    (eventId: string, phaseId: string) => {
      setEvents((current) =>
        current.map((event) =>
          event.id === eventId
            ? {
                ...event,
                phases: event.phases.filter((phase) => phase.id !== phaseId),
                touched: true,
              }
            : event,
        ),
      );
      markDirty();
    },
    [markDirty],
  );

  const updatePhase = useCallback(
    (eventId: string, phaseId: string, patch: Partial<PhaseDraftVM>) => {
      setEvents((current) => {
        let focus: PhaseFocusRequest | null = null;
        const next = current.map((event) => {
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

        if (focus !== null) requestFocus(focus);
        return next;
      });
      markDirty();
    },
    [markDirty, requestFocus],
  );

  const validate = useCallback((): ValidationOutcome<LifeEvent[], EventErrorsById> => {
    const errors: EventErrorsById = {};
    const built: unknown[] = [];

    for (const event of events) {
      const eventErrors = validateEventDraft(event);
      if (Object.keys(eventErrors).length > 0) errors[event.id] = eventErrors;
      built.push(buildEvent(event));
    }

    const all = LifeEventsSchema.safeParse(built);
    return {
      ok: Object.keys(errors).length === 0 && all.success,
      data: all.success ? all.data : undefined,
      errors,
    };
  }, [events]);

  const validation = useMemo(() => validate(), [validate]);

  const visibleErrors = useMemo(() => {
    const visible: EventErrorsById = {};
    for (const event of events) {
      const errors = validation.errors[event.id];
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
  }, [events, validation.errors]);

  const replaceAll = useCallback((next: LifeEvent[]) => {
    setEvents(next.map(eventFromDomain));
  }, []);

  /** CALCULATE reveals every event and phase error. */
  const revealAll = useCallback(() => {
    setEvents((current) =>
      current.map((event) => ({
        ...event,
        touched: true,
        phases: event.phases.map((phase) => ({ ...phase, touched: true })),
      })),
    );
  }, []);

  return {
    events,
    errors: visibleErrors,
    valid: validation.ok,
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
