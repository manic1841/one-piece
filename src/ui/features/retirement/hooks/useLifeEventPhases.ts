import { useCallback } from 'react';

import { EVENT_LABELS } from '@/ui/constants/retirement/eventLabels';
import {
  type LifeEventDraftVM,
  type PhaseDraftVM,
  type PhaseFocusRequest,
  blankPhase,
  focusTargetFor,
  isCompleteYear,
  sortEvents,
  sortPhases,
} from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';

/** `Prefix 1`, `Prefix 2`, … skipping numbers already taken by `existing`. */
export function nextDefaultName(existing: readonly string[], prefix: string): string {
  const taken = new Set<number>();
  for (const name of existing) {
    const match = name.match(new RegExp(`^${prefix} (\\d+)$`));
    if (match !== null) taken.add(Number(match[1]));
  }
  let next = 1;
  while (taken.has(next)) next += 1;
  return `${prefix} ${next}`;
}

interface PhaseDraftOptions {
  /** Authoritative drafts. Never trust the caller's idea of an owner: a drag commits per move. */
  latest: React.RefObject<LifeEventDraftVM[]>;
  commit: (next: LifeEventDraftVM[]) => void;
  requestFocus: (request: PhaseFocusRequest | null) => void;
}

/**
 * Phase-level mutations. Every phase belongs to exactly one event, and an
 * event never holds zero phases, so removal and re-parenting both leave a
 * blank phase behind rather than an unreachable row.
 */
export function useLifeEventPhases({ latest, commit, requestFocus }: PhaseDraftOptions) {
  /** List create: a phase on `year`, placed where its year belongs. */
  const addPhase = useCallback(
    (eventId: string, year: number) => {
      let phaseId = '';
      commit(
        latest.current.map((event) => {
          if (event.id !== eventId) return event;
          const phase = {
            ...blankPhase(),
            name: nextDefaultName(
              event.phases.map((existing) => existing.name),
              EVENT_LABELS.PHASE_NAME_PREFIX,
            ),
            startYearText: String(year),
            endYearText: String(year),
          };
          phaseId = phase.id;
          return { ...event, phases: sortPhases([...event.phases, phase]), touched: true };
        }),
      );
      return phaseId;
    },
    [commit, latest],
  );

  /** Timeline create: a phase already carrying the clicked range. */
  const addPhaseAt = useCallback(
    (eventId: string, startYear: number, endYear: number) => {
      let phaseId = '';
      commit(
        latest.current.map((event) => {
          if (event.id !== eventId) return event;
          const phase = {
            ...blankPhase(),
            name: nextDefaultName(
              event.phases.map((existing) => existing.name),
              EVENT_LABELS.PHASE_NAME_PREFIX,
            ),
            startYearText: String(startYear),
            endYearText: String(endYear),
          };
          phaseId = phase.id;
          return { ...event, phases: sortPhases([...event.phases, phase]), touched: true };
        }),
      );
      return phaseId;
    },
    [commit, latest],
  );

  /**
   * Move a phase onto another event; it adopts the target event's side. The
   * current owner is looked up from the phase id, never taken from the caller:
   * a drag commits once per pointer move, so the caller's idea of the owner is
   * stale after the first one.
   *
   * Omit the years to keep the span as typed (a blank year stays blank) — that
   * is the pointer-free re-parent the inspector uses. Passing the same event id
   * settles a range edit in place.
   */
  const movePhase = useCallback(
    (phaseId: string, targetEventId: string, startYear?: number, endYear?: number) => {
      const current = latest.current;
      const owner = current.find((event) => event.phases.some((phase) => phase.id === phaseId));
      const moving = owner?.phases.find((phase) => phase.id === phaseId);
      if (owner === undefined || moving === undefined) return;

      const changedRows = owner.id !== targetEventId;
      const targetNames = (current.find((event) => event.id === targetEventId)?.phases ?? []).map(
        (phase) => phase.name,
      );
      const moved = {
        ...moving,
        // Two bars in one row must be told apart; only the colliding name moves.
        name:
          changedRows && targetNames.includes(moving.name)
            ? nextDefaultName(targetNames, EVENT_LABELS.PHASE_NAME_PREFIX)
            : moving.name,
        startYearText:
          startYear !== undefined && Number.isFinite(startYear)
            ? String(startYear)
            : moving.startYearText,
        endYearText:
          endYear !== undefined && Number.isFinite(endYear) ? String(endYear) : moving.endYearText,
        touched: true,
      };
      commit(
        current.map((event) => {
          if (event.id === owner.id && changedRows) {
            // An event never holds zero phases: the vacated row keeps a blank
            // one on the years the phase just left.
            const rest = event.phases.filter((phase) => phase.id !== phaseId);
            return {
              ...event,
              phases:
                rest.length > 0
                  ? rest
                  : [
                      {
                        ...blankPhase(),
                        name: nextDefaultName(
                          event.phases.map((existing) => existing.name),
                          EVENT_LABELS.PHASE_NAME_PREFIX,
                        ),
                        startYearText: moving.startYearText,
                        endYearText: moving.endYearText,
                      },
                    ],
              touched: true,
            };
          }
          if (event.id !== targetEventId) return event;
          const phases = changedRows
            ? [...event.phases, moved]
            : event.phases.map((phase) => (phase.id === phaseId ? moved : phase));
          return { ...event, phases: sortPhases(phases), touched: true };
        }),
      );
    },
    [commit, latest],
  );

  /** Re-parent from the inspector: the span is kept exactly as typed. */
  const reparentPhase = useCallback(
    (phaseId: string, targetEventId: string) => movePhase(phaseId, targetEventId),
    [movePhase],
  );

  /**
   * Removes a phase and returns the phase to select next. An event never holds
   * zero phases, so deleting the last one leaves a blank phase on the same years
   * behind and sends focus to its start year.
   */
  const removePhase = useCallback(
    (eventId: string, phaseId: string) => {
      const event = latest.current.find((candidate) => candidate.id === eventId);
      const removed = event?.phases.find((phase) => phase.id === phaseId);
      if (event === undefined || removed === undefined) return phaseId;

      const remaining = event.phases.filter((phase) => phase.id !== phaseId);
      const replacement =
        remaining.length > 0
          ? null
          : {
              ...blankPhase(),
              name: nextDefaultName(
                event.phases.map((existing) => existing.name),
                EVENT_LABELS.PHASE_NAME_PREFIX,
              ),
              startYearText: removed.startYearText,
              endYearText: removed.endYearText,
            };
      const phases = replacement === null ? remaining : [replacement];
      commit(
        latest.current.map((candidate) =>
          candidate.id === eventId ? { ...candidate, phases } : candidate,
        ),
      );
      if (replacement === null) return phaseId;
      requestFocus({ eventId, phaseId: replacement.id, field: 'startYear', sequence: 0 });
      return replacement.id;
    },
    [commit, latest, requestFocus],
  );

  const updatePhase = useCallback(
    (eventId: string, phaseId: string, patch: Partial<PhaseDraftVM>) => {
      let focus: PhaseFocusRequest | null = null;
      // Half-typed years keep the current order so the row does not jump under
      // the caret; a finished year settles both the phase and the event order.
      const settled = isCompleteYear(patch.startYearText) || isCompleteYear(patch.endYearText);

      const next = latest.current.map((event) => {
        if (event.id !== eventId) return event;

        const patched = event.phases.map((phase) =>
          phase.id === phaseId ? { ...phase, ...patch, touched: true } : phase,
        );
        const phases = sortPhases(patched);
        const updated = { ...event, phases: settled ? phases : patched, touched: true };

        if (patch.startYearText !== undefined || patch.endYearText !== undefined) {
          focus = focusTargetFor({ ...updated, phases });
        }
        return updated;
      });

      commit(settled ? sortEvents(next) : next);
      if (focus !== null) requestFocus(focus);
    },
    [commit, latest, requestFocus],
  );

  return {
    addPhase,
    addPhaseAt,
    movePhase,
    reparentPhase,
    removePhase,
    updatePhase,
  };
}
