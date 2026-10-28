import { useCallback, useRef, useState } from 'react';

import {
  TIMELINE_DRAG_THRESHOLD_PX,
  type TimelineBar,
  type TimelineFocus,
  type TimelineRange,
  type TimelineRow,
  moveDraftFromDelta,
  resizeDraftFromEdge,
  yearAtPoint,
} from '@/ui/features/retirement/viewmodels/retirementTimeline.vm';

/** The pointer gesture in flight; `create` draws a new phase, the rest edit one. */
export type Gesture =
  | {
      kind: 'create';
      anchorYear: number;
      currentYear: number;
      /** Row the press started on; the phase is created there, not in the selection. */
      targetEventId: string | null;
    }
  | {
      kind: 'move' | 'start' | 'end';
      eventId: string;
      phaseId: string;
      origStart: number;
      origEnd: number;
      anchorYear: number;
      year: number;
      targetEventId: string;
      moved: boolean;
    };

interface UseTimelineGestureOptions {
  rows: TimelineRow[];
  range: TimelineRange;
  visibleYears: number;
  /** Row height in px; the pointer's y resolves to a row through it. */
  rowHeight: number;
  readOnly: boolean;
  windowStart: number;
  plotRef: React.RefObject<HTMLDivElement | null>;
  rowsRef: React.RefObject<HTMLDivElement | null>;
  /** Pointer capture target: moves and the release are tracked on it. */
  captureRef: React.RefObject<HTMLDivElement | null>;
  phaseIdAt: (eventId: string, barIndex: number) => string;
  setFocus: (focus: TimelineFocus) => void;
  onSelect: (selection: { eventId: string; phaseId: string }) => void;
  onCreate: (startYear: number, endYear: number, eventId: string | null) => void;
  onGestureStart: () => void;
  onRangeChange: (
    eventId: string,
    phaseId: string,
    targetEventId: string,
    startYear: number,
    endYear: number,
  ) => void;
}

export interface TimelineGesture {
  gesture: Gesture | null;
  /** The dragged bar's provisional range; every other bar is returned untouched. */
  preview: (bar: TimelineBar) => { startYear: number; endYear: number };
  onBackgroundPointerDown: (event: React.PointerEvent) => void;
  onBarPointerDown: (event: React.PointerEvent, rowIndex: number, barIndex: number) => void;
  onEdgePointerDown: (
    event: React.PointerEvent,
    bar: { eventId: string; index: number; startYear: number; endYear: number },
    edge: 'start' | 'end',
  ) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  settle: () => void;
  cancel: () => void;
}

/**
 * The timeline's pointer state machine: press, drag across years or rows, drop.
 *
 * Moves write on every crossing, but the undo entry is pushed once, at the
 * first move that actually changes something — a press that turns out to be a
 * click must not land in the history. Reparenting follows the pointer's row
 * alone: a cell can be 55px wide, so waiting for a whole year of horizontal
 * travel before switching rows would make a straight downward drop do nothing.
 */
export function useTimelineGesture({
  rows,
  range,
  visibleYears,
  rowHeight,
  readOnly,
  windowStart,
  plotRef,
  rowsRef,
  captureRef,
  phaseIdAt,
  setFocus,
  onSelect,
  onCreate,
  onGestureStart,
  onRangeChange,
}: UseTimelineGestureOptions): TimelineGesture {
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const started = useRef(false);

  const yearFromEvent = useCallback(
    (event: React.PointerEvent): number => {
      const rect = plotRef.current?.getBoundingClientRect();
      if (rect === undefined) return windowStart;
      return yearAtPoint(event.clientX, rect, windowStart, visibleYears);
    },
    [plotRef, visibleYears, windowStart],
  );

  const rowAt = (clientY: number): number => {
    const rect = rowsRef.current?.getBoundingClientRect();
    if (rect === undefined) return 0;
    return Math.max(0, Math.min(rows.length - 1, Math.floor((clientY - rect.top) / rowHeight)));
  };

  const begin = (event: React.PointerEvent) => {
    started.current = false;
    captureRef.current?.setPointerCapture(event.pointerId);
  };

  const onBackgroundPointerDown = (event: React.PointerEvent) => {
    if (readOnly) return;
    const year = yearFromEvent(event);
    begin(event);
    setGesture({
      kind: 'create',
      anchorYear: year,
      currentYear: year,
      targetEventId: rows[rowAt(event.clientY)]?.id ?? null,
    });
  };

  const onBarPointerDown = (event: React.PointerEvent, rowIndex: number, barIndex: number) => {
    event.stopPropagation();
    const bar = rows[rowIndex]?.bars[barIndex];
    if (bar === undefined) return;
    const phaseId = phaseIdAt(bar.eventId, bar.index);
    // Read-only leaves the bar inspectable; only the drags need a draft.
    if (readOnly) {
      onSelect({ eventId: bar.eventId, phaseId });
      return;
    }
    const year = yearFromEvent(event);
    begin(event);
    setGesture({
      kind: 'move',
      eventId: bar.eventId,
      phaseId,
      origStart: bar.startYear,
      origEnd: bar.endYear,
      anchorYear: year,
      year,
      targetEventId: bar.eventId,
      moved: false,
    });
    setFocus({ rowIndex, barIndex });
  };

  const onEdgePointerDown = (
    event: React.PointerEvent,
    bar: { eventId: string; index: number; startYear: number; endYear: number },
    edge: 'start' | 'end',
  ) => {
    if (readOnly) return;
    event.stopPropagation();
    const year = yearFromEvent(event);
    begin(event);
    setGesture({
      kind: edge,
      eventId: bar.eventId,
      phaseId: phaseIdAt(bar.eventId, bar.index),
      origStart: bar.startYear,
      origEnd: bar.endYear,
      anchorYear: year,
      year,
      targetEventId: bar.eventId,
      moved: false,
    });
  };

  const apply = (current: Extract<Gesture, { kind: 'move' | 'start' | 'end' }>, year: number) => {
    const draft =
      current.kind === 'move'
        ? moveDraftFromDelta({
            eventId: current.eventId,
            index: 0,
            targetEventId: current.targetEventId,
            origStart: current.origStart,
            origEnd: current.origEnd,
            deltaYears: year - current.anchorYear,
            range,
          })
        : resizeDraftFromEdge({
            eventId: current.eventId,
            index: 0,
            edge: current.kind,
            origStart: current.origStart,
            origEnd: current.origEnd,
            year,
          });
    onRangeChange(
      current.eventId,
      current.phaseId,
      'targetEventId' in draft ? draft.targetEventId : current.targetEventId,
      draft.startYear,
      draft.endYear,
    );
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (gesture === null) return;
    const year = yearFromEvent(event);
    if (gesture.kind === 'create') {
      const targetEventId = rows[rowAt(event.clientY)]?.id ?? gesture.targetEventId;
      setGesture({ ...gesture, currentYear: year, targetEventId });
      return;
    }
    const targetEventId = rows[rowAt(event.clientY)]?.id ?? gesture.targetEventId;
    const rowChanged = targetEventId !== gesture.targetEventId;
    const moved =
      gesture.moved ||
      rowChanged ||
      (Math.abs(year - gesture.anchorYear) * (plotRef.current?.clientWidth ?? 1)) / visibleYears >
        TIMELINE_DRAG_THRESHOLD_PX;
    const next = { ...gesture, year, targetEventId, moved };
    setGesture(next);
    if (year === gesture.year && !rowChanged) return;
    if (!started.current) {
      if (!moved) return;
      started.current = true;
      onGestureStart();
    }
    apply(next, year);
  };

  const settle = () => {
    if (gesture === null) return;

    if (gesture.kind === 'create') {
      onCreate(
        Math.min(gesture.anchorYear, gesture.currentYear),
        Math.max(gesture.anchorYear, gesture.currentYear),
        gesture.targetEventId,
      );
      setGesture(null);
      return;
    }

    if (!gesture.moved) {
      onSelect({ eventId: gesture.eventId, phaseId: gesture.phaseId });
      setGesture(null);
      return;
    }

    // A pointer may never cross the threshold in a single move event, so the
    // final position is always written once more.
    if (!started.current) onGestureStart();
    apply(gesture, gesture.year);
    started.current = false;
    setGesture(null);
  };

  const preview = (bar: TimelineBar) => {
    if (gesture === null || gesture.kind === 'create') return bar;
    if (phaseIdAt(bar.eventId, bar.index) !== gesture.phaseId) return bar;
    if (gesture.kind === 'move') {
      const delta = gesture.year - gesture.anchorYear;
      return { startYear: gesture.origStart + delta, endYear: gesture.origEnd + delta };
    }
    if (gesture.kind === 'start') {
      return { startYear: Math.min(gesture.year, gesture.origEnd), endYear: gesture.origEnd };
    }
    return { startYear: gesture.origStart, endYear: Math.max(gesture.year, gesture.origStart) };
  };

  return {
    gesture,
    preview,
    onBackgroundPointerDown,
    onBarPointerDown,
    onEdgePointerDown,
    onPointerMove,
    settle,
    cancel: () => setGesture(null),
  };
}
