import * as React from 'react';

import { prefersReducedMotion } from '@/ui/hooks/useReducedMotion';
import { DURATION } from '@/ui/motion';

import { shouldDismiss } from './sheetDrag';

/** Upward drags are clamped here so the sheet cannot be pulled above its slot. */
const OVERDRAG_LIMIT = 0.2;

/** Safety net if `transitionend` never arrives (interrupted, zero-distance). */
const SETTLE_FALLBACK_MS = DURATION.slow + 100;

type DragState = {
  startY: number;
  lastY: number;
  lastAt: number;
  velocity: number;
  pointerId: number;
};

export type SheetDrag = {
  /** Inline transform for the sheet while a gesture or its settling motion runs. */
  offset: number | null;
  dragging: boolean;
  /** Drop the transform; the portal remounts a fresh sheet on every open. */
  reset: () => void;
  handlers: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
  };
};

/**
 * Pointer gesture for a bottom sheet (motion-system §5.3, ADR-0091). The drag
 * follows the pointer with no easing and clamps upward travel. On release it
 * either asks the caller to close or settles back.
 *
 * The inline transform owns the whole exit: the content opts out of Radix's
 * closed-state animation, so closing is announced only once the sheet has
 * finished moving. Clearing the transform first would let Radix replay its own
 * slide from zero — the sheet would jump back and leave twice.
 */
export const useSheetDrag = (
  surfaceRef: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
): SheetDrag => {
  const [offset, setOffset] = React.useState<number | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [reduced] = React.useState(prefersReducedMotion);
  const drag = React.useRef<DragState | null>(null);
  const timer = React.useRef<number | null>(null);
  const frame = React.useRef<number | null>(null);
  const settleListeners = React.useRef<(() => void) | null>(null);

  const clearSettle = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    settleListeners.current?.();
    settleListeners.current = null;
  };

  /** Animate to `target`, then run `after` once the sheet has arrived. */
  const settle = (target: number, after: () => void) => {
    setDragging(false);
    setOffset(target);
    clearSettle();

    const surface = surfaceRef.current;
    const finish = () => {
      clearSettle();
      // The transform deliberately stays: the node unmounts on close, and the
      // returned offset is already its resting value.
      after();
    };

    if (reduced || surface === null) {
      frame.current = requestAnimationFrame(finish);
      return;
    }

    const onEnd = (event: TransitionEvent) => {
      if (event.target === surface && event.propertyName === 'transform') finish();
    };
    surface.addEventListener('transitionend', onEnd);
    settleListeners.current = () => surface.removeEventListener('transitionend', onEnd);
    timer.current = window.setTimeout(finish, SETTLE_FALLBACK_MS);
  };

  const height = () => surfaceRef.current?.getBoundingClientRect().height ?? 0;

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || surfaceRef.current === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      startY: event.clientY,
      lastY: event.clientY,
      lastAt: event.timeStamp,
      velocity: 0,
      pointerId: event.pointerId,
    };
    clearSettle();
    setDragging(true);
    setOffset(0);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (state === null || event.pointerId !== state.pointerId) return;

    const displacement = event.clientY - state.startY;
    const elapsed = event.timeStamp - state.lastAt;
    // A pause before release must not keep an old flick velocity alive.
    state.velocity = elapsed > 0 ? (event.clientY - state.lastY) / elapsed : 0;
    state.lastAt = event.timeStamp;
    state.lastY = event.clientY;

    setOffset(displacement > 0 ? displacement : Math.max(displacement, -height() * OVERDRAG_LIMIT));
  };

  const onPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (state === null || event.pointerId !== state.pointerId) return;
    drag.current = null;

    const displacement = state.lastY - state.startY;
    if (shouldDismiss(displacement, state.velocity, height())) {
      settle(height() || displacement, onDismiss);
      return;
    }
    settle(0, () => {});
  };

  // A cancelled pointer (scroll takeover, OS gesture) never dismisses.
  const onPointerCancel = () => {
    drag.current = null;
    settle(0, () => {});
  };

  React.useEffect(() => clearSettle, []);

  const reset = React.useCallback(() => {
    clearSettle();
    drag.current = null;
    setDragging(false);
    setOffset(null);
  }, []);

  return {
    offset,
    dragging,
    reset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
};
