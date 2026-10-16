import { useCallback, useEffect, useRef } from 'react';

import { TOAST_TIMEOUT_MS, type ToastTone, showToast } from '@/ui/components/Toast';

/** A pending undo: the message to report and the compensating write to run. */
export type UndoRequest = {
  /** Short status message shown in the toast, e.g. "ROW DELETED". */
  message: string;
  /**
   * Restores the persisted state. The caller captures the affected collection's
   * previous value and performs a compensating whole-collection replace here;
   * the hook introduces no draft layer of its own.
   */
  undo: () => void | Promise<void>;
  /** Action button label; defaults to "UNDO". */
  actionLabel?: string;
  tone?: ToastTone;
};

type Slot = { undo: () => void | Promise<void> };

/**
 * Single-slot undo (spec #301 §2.4): offering a new undoable action surfaces a
 * toast with an Undo action and discards any previous offer. The slot expires
 * after {@link TOAST_TIMEOUT_MS}; there is no multi-step history.
 */
export function useUndo(): { offer: (request: UndoRequest) => void } {
  const slotRef = useRef<Slot | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSlot = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    slotRef.current = null;
  }, []);

  useEffect(() => clearSlot, [clearSlot]);

  const offer = useCallback(
    (request: UndoRequest) => {
      clearSlot();
      const slot: Slot = { undo: request.undo };
      slotRef.current = slot;
      timerRef.current = setTimeout(() => {
        if (slotRef.current === slot) slotRef.current = null;
        timerRef.current = null;
      }, TOAST_TIMEOUT_MS);

      showToast(request.message, request.tone ?? 'success', {
        actionLabel: request.actionLabel ?? 'UNDO',
        onAction: () => {
          // A stale toast from a superseded offer must not fire the new slot's undo.
          if (slotRef.current !== slot) return;
          clearSlot();
          void slot.undo();
        },
      });
    },
    [clearSlot],
  );

  return { offer };
}
