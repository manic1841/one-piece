import { useEffect, useRef } from 'react';

import { type PhaseFocusRequest } from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';

/** Error field -> the form field it belongs to. */
const FIELD_NAMES = {
  name: 'name',
  startYear: 'startYearText',
  endYear: 'endYearText',
  amount: 'amountText',
  growthRate: 'growthRateText',
} as const;

/**
 * Focuses the offending input once an error names this phase. The container is
 * returned as a ref so the lookup stays inside one surface: the inspector and
 * the list row carry the same field names, and only one of them is visible.
 *
 * A null request disables the hook, which is how a surface opts out while it is
 * hidden.
 */
export function usePhaseFieldFocus<T extends HTMLElement>(
  focusRequest: PhaseFocusRequest | null,
  eventId: string,
  phaseId: string,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (focusRequest === null || focusRequest.phaseId !== phaseId) return;
    const path = `eventsById.${eventId}.phasesById.${phaseId}.${FIELD_NAMES[focusRequest.field]}`;
    // Deferred by a tick: errors usually surface on blur, and the click that
    // caused the blur finishes afterwards and would drag focus back to `body`.
    const timer = window.setTimeout(() => {
      ref.current?.querySelector<HTMLElement>(`[name="${path}"]`)?.focus();
    }, 0);
    // `sequence` makes a repeated request on the same field focus again.
    return () => window.clearTimeout(timer);
  }, [focusRequest, eventId, phaseId]);

  return ref;
}
