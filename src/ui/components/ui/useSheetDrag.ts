import * as React from 'react';

import { shouldDismiss } from './sheetDrag';

/** Upward drags are clamped here so the sheet cannot be pulled above its slot. */
const OVERDRAG_LIMIT = 0.2;

/** The sheet returns within `duration-slow`; the timer is the floor if `transitionend` never comes. */
const SETTLE_MS = 400;

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
 * either asks the caller to close or settles back; closing is announced only
 * after the off-screen motion finishes, so Radix's own exit animation never
 * fights the inline transform.
 */
export const useSheetDrag = (
  surfaceRef: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
): SheetDrag => {
  const [offset, setOffset] = React.useState<number | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const drag = React.useRef<DragState | null>(null);
  const timer = React.useRef<number | null>(null);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  /** Animate to `target`, then run `after` once the sheet has arrived. */
  const settle = (target: number, after: () => void) => {
    setDragging(false);
    setOffset(target);
    clearTimer();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setOffset(null);
      after();
    }, SETTLE_MS);
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
    clearTimer();
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

  React.useEffect(() => clearTimer, []);

  return {
    offset,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
};
