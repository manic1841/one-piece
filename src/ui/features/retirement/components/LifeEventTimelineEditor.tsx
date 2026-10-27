import { useEffect, useMemo, useRef, useState } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { RULE_TYPE_LABELS } from '@/ui/constants/retirement/setupLabels';
import {
  WORKSPACE_ACTION_LABELS,
  WORKSPACE_RAIL_LABELS,
} from '@/ui/constants/retirement/workspaceRailLabels';
import { type LifeEventDraftVM } from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';
import {
  DESKTOP_VISIBLE_YEARS,
  MOBILE_VISIBLE_YEARS,
  TIMELINE_DRAG_THRESHOLD_PX,
  TIMELINE_PAN_STEPS,
  type TimelineFocus,
  type TimelineFocusKey,
  type TimelineRow,
  barGeometry,
  clampWindowStart,
  deriveTimelineRange,
  initialTimelineFocus,
  initialWindowStart,
  mapTimelineRows,
  moveDraftFromDelta,
  moveTimelineFocus,
  panWindowStart,
  resizeDraftFromEdge,
  timelineBarLabel,
  timelineFocusBar,
  timelineWindowBounds,
  windowStartToRevealBar,
  yearAtPoint,
} from '@/ui/features/retirement/viewmodels/retirementTimeline.vm';
import { cn } from '@/ui/utils/cn';

export interface TimelineSelection {
  eventId: string;
  phaseId: string;
}

interface LifeEventTimelineEditorProps {
  events: LifeEventDraftVM[];
  readOnly: boolean;
  projectionStartYear: number;
  birthYear: number;
  lifeExpectancy: number;
  retirementYear: number | null;
  selection: TimelineSelection | null;
  revealYear: number | null;
  onSelect: (selection: TimelineSelection) => void;
  onCreate: (startYear: number, endYear: number) => void;
  onGestureStart: () => void;
  onRangeChange: (
    eventId: string,
    phaseId: string,
    targetEventId: string,
    startYear: number,
    endYear: number,
  ) => void;
}

type Gesture =
  | {
      kind: 'create';
      anchorYear: number;
      currentYear: number;
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

const ROW_HEIGHT = 30;

const useVisibleYears = () => {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(max-width: 767px)');
    const listener = () => setMobile(query.matches);
    listener();
    query.addEventListener?.('change', listener);
    return () => query.removeEventListener?.('change', listener);
  }, []);
  return mobile ? MOBILE_VISIBLE_YEARS : DESKTOP_VISIBLE_YEARS;
};

/**
 * Editable life-event timeline. One row per event, one bar per phase, a fixed
 * window with pan only. Drags write to the draft on release; every gesture
 * pushes one undo entry through `onGestureStart`.
 */
export function LifeEventTimelineEditor({
  events,
  readOnly,
  projectionStartYear,
  birthYear,
  lifeExpectancy,
  retirementYear,
  selection,
  revealYear,
  onSelect,
  onCreate,
  onGestureStart,
  onRangeChange,
}: LifeEventTimelineEditorProps) {
  const visibleYears = useVisibleYears();
  const range = useMemo(
    () =>
      deriveTimelineRange({
        currentYear: projectionStartYear,
        birthYear,
        lifeExpectancy: Number.isFinite(lifeExpectancy) ? lifeExpectancy : 1,
      }),
    [birthYear, lifeExpectancy, projectionStartYear],
  );
  const bounds = useMemo(() => timelineWindowBounds(range, visibleYears), [range, visibleYears]);
  const [windowStart, setWindowStart] = useState(() =>
    initialWindowStart(range, range.startYear, visibleYears),
  );
  const [focus, setFocus] = useState<TimelineFocus | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const gestureStarted = useRef(false);
  const currentWindowStart = clampWindowStart(windowStart, bounds);

  useEffect(() => {
    if (focus === null) return;
    const bar = trackRef.current?.querySelector<HTMLElement>(
      `[data-bar="${focus.rowIndex}:${focus.barIndex}"]`,
    );
    bar?.focus();
  }, [focus]);

  // The rail can ask for a year. Adjusting state during render (instead of in
  // an effect) means no frame is painted at the old window.
  const [revealedYear, setRevealedYear] = useState<number | null>(null);
  if (revealYear !== null && revealYear !== revealedYear) {
    setRevealedYear(revealYear);
    setWindowStart((current) =>
      windowStartToRevealBar(
        { startYear: revealYear, endYear: revealYear },
        current,
        visibleYears,
        bounds,
      ),
    );
  }
  const rows = useMemo<TimelineRow[]>(() => {
    return mapTimelineRows(
      events.map((event) => ({
        id: event.id,
        name: event.name.trim() === '' ? RULE_TYPE_LABELS[event.type] : event.name,
        type: event.type,
        phases: event.phases.map((phase, index) => {
          const start = Number(phase.startYearText);
          const end = Number(phase.endYearText);
          return {
            index,
            name: phase.name,
            startYear: Number.isFinite(start) ? start : range.startYear,
            endYear: Number.isFinite(end) ? end : Number.isFinite(start) ? start : range.startYear,
          };
        }),
      })),
    );
  }, [events, range.startYear]);

  const anchorYear =
    retirementYear !== null && retirementYear >= range.startYear && retirementYear <= range.endYear
      ? retirementYear
      : null;

  const yearFromEvent = (event: React.PointerEvent): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (rect === undefined) return currentWindowStart;
    return yearAtPoint(event.clientX, rect, currentWindowStart, visibleYears);
  };

  const rowAt = (clientY: number): number => {
    const rect = rowsRef.current?.getBoundingClientRect();
    if (rect === undefined) return 0;
    return Math.max(0, Math.min(rows.length - 1, Math.floor((clientY - rect.top) / ROW_HEIGHT)));
  };

  const onBackgroundPointerDown = (event: React.PointerEvent) => {
    if (readOnly) return;
    const year = yearFromEvent(event);
    gestureStarted.current = false;
    setGesture({ kind: 'create', anchorYear: year, currentYear: year });
    trackRef.current?.setPointerCapture(event.pointerId);
  };

  const onBarPointerDown = (event: React.PointerEvent, rowIndex: number, barIndex: number) => {
    if (readOnly) return;
    event.stopPropagation();
    const row = rows[rowIndex];
    const bar = row?.bars[barIndex];
    if (bar === undefined) return;
    gestureStarted.current = false;
    const year = yearFromEvent(event);
    setGesture({
      kind: 'move',
      eventId: bar.eventId,
      phaseId:
        bar.id.split(':')[1] === undefined ? '' : (phasesOf(bar.eventId)[bar.index]?.id ?? ''),
      origStart: bar.startYear,
      origEnd: bar.endYear,
      anchorYear: year,
      year,
      targetEventId: bar.eventId,
      moved: false,
    });
    trackRef.current?.setPointerCapture(event.pointerId);
    setFocus({ rowIndex, barIndex });
  };

  const phasesOf = (eventId: string) => events.find((event) => event.id === eventId)?.phases ?? [];

  const onEdgePointerDown = (
    event: React.PointerEvent,
    bar: { eventId: string; index: number; startYear: number; endYear: number },
    edge: 'start' | 'end',
  ) => {
    if (readOnly) return;
    event.stopPropagation();
    gestureStarted.current = false;
    const year = yearFromEvent(event);
    setGesture({
      kind: edge,
      eventId: bar.eventId,
      phaseId: phasesOf(bar.eventId)[bar.index]?.id ?? '',
      origStart: bar.startYear,
      origEnd: bar.endYear,
      anchorYear: year,
      year,
      targetEventId: bar.eventId,
      moved: false,
    });
    trackRef.current?.setPointerCapture(event.pointerId);
  };

  const applyGesture = (
    current: Extract<Gesture, { kind: 'move' | 'start' | 'end' }>,
    year: number,
  ) => {
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
      setGesture({ ...gesture, currentYear: year });
      return;
    }
    const targetEventId = rows[rowAt(event.clientY)]?.id ?? gesture.targetEventId;
    const moved =
      gesture.moved ||
      (Math.abs(year - gesture.anchorYear) * (trackRef.current?.clientWidth ?? 1)) / visibleYears >
        TIMELINE_DRAG_THRESHOLD_PX;
    const next = { ...gesture, year, targetEventId, moved };
    setGesture(next);
    if (year === gesture.year) return;
    if (!gestureStarted.current) {
      if (!moved) return;
      gestureStarted.current = true;
      onGestureStart();
    }
    applyGesture(next, year);
  };

  const settle = () => {
    if (gesture === null) return;

    if (gesture.kind === 'create') {
      const start = Math.min(gesture.anchorYear, gesture.currentYear);
      const end = Math.max(gesture.anchorYear, gesture.currentYear);
      onCreate(start, end);
      setGesture(null);
      return;
    }

    if (!gesture.moved) {
      onSelect({ eventId: gesture.eventId, phaseId: gesture.phaseId });
      setGesture(null);
      return;
    }

    // A keyboard-free pointer drag may never cross the threshold in a single
    // move event, so the final position is always written once more.
    if (!gestureStarted.current) onGestureStart();
    applyGesture(gesture, gesture.year);
    gestureStarted.current = false;
    setGesture(null);
  };

  const preview = (bar: { startYear: number; endYear: number }) => {
    if (gesture === null || gesture.kind === 'create') return bar;
    if (gesture.kind === 'move') {
      const delta = gesture.year - gesture.anchorYear;
      return { startYear: gesture.origStart + delta, endYear: gesture.origEnd + delta };
    }
    if (gesture.kind === 'start') {
      return { startYear: Math.min(gesture.year, gesture.origEnd), endYear: gesture.origEnd };
    }
    return { startYear: gesture.origStart, endYear: Math.max(gesture.year, gesture.origStart) };
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys: TimelineFocusKey[] = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];
    if (!keys.includes(event.key as TimelineFocusKey)) {
      if (event.key === 'Enter' || event.key === ' ') {
        const bar = timelineFocusBar(rows, focus);
        if (bar !== null) {
          event.preventDefault();
          onSelect({ eventId: bar.eventId, phaseId: phasesOf(bar.eventId)[bar.index]?.id ?? '' });
        }
      }
      return;
    }
    event.preventDefault();
    const activeFocus = focus ?? initialTimelineFocus(rows);
    if (activeFocus === null) return;
    const next = moveTimelineFocus(rows, activeFocus, event.key as TimelineFocusKey);
    setFocus(next);
    const bar = timelineFocusBar(rows, next);
    if (bar !== null) {
      setWindowStart((current) => windowStartToRevealBar(bar, current, visibleYears, bounds));
    }
  };

  const ticks: number[] = [];
  for (let year = currentWindowStart; year < currentWindowStart + visibleYears; year += 1) {
    ticks.push(year);
  }

  return (
    <div data-testid="life-event-timeline-editor" className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{WORKSPACE_ACTION_LABELS.EVENT_ADD_HINT}</p>
        <div className="flex items-center gap-1">
          {TIMELINE_PAN_STEPS.map((step) => (
            <Button
              key={`left-${step}`}
              variant="text"
              size="sm"
              aria-label={`Pan ${step} year${step === 1 ? '' : 's'} back`}
              onClick={() => setWindowStart((current) => panWindowStart(current, -step, bounds))}
            >
              <ChevronLeft size={14} />
            </Button>
          ))}
          {TIMELINE_PAN_STEPS.map((step) => (
            <Button
              key={`right-${step}`}
              variant="text"
              size="sm"
              aria-label={`Pan ${step} year${step === 1 ? '' : 's'} forward`}
              onClick={() => setWindowStart((current) => panWindowStart(current, step, bounds))}
            >
              <ChevronRight size={14} />
            </Button>
          ))}
        </div>
      </div>

      <div
        ref={trackRef}
        role="toolbar"
        aria-label={WORKSPACE_ACTION_LABELS.TIMELINE_LABEL}
        className={cn(
          'relative grid select-none border-y border-border py-1',
          !readOnly && 'cursor-crosshair',
        )}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={() => setGesture(null)}
        onKeyDown={onKeyDown}
        tabIndex={0}
      >
        <div className="pointer-events-none absolute inset-0 grid">
          {ticks.map((tick) => (
            <span
              key={tick}
              className={cn(
                'border-l border-border/60',
                tick === anchorYear && 'border-dashed border-border-strong',
              )}
              style={{
                gridColumn: tick - currentWindowStart + 1,
              }}
            />
          ))}
        </div>

        <div ref={rowsRef}>
          {rows.map((row, rowIndex) => (
            <div key={row.id} className="relative" style={{ height: ROW_HEIGHT }}>
              <span className="pointer-events-none absolute left-1 top-1 z-10 max-w-[40%] truncate text-[11px] text-muted-foreground">
                {row.name.trim() === '' ? RULE_TYPE_LABELS[row.tone] : row.name}
              </span>
              {row.bars.map((bar, barIndex) => {
                const barPreview = preview(bar);
                const shape = barGeometry(barPreview, currentWindowStart, visibleYears);
                if (!shape.visible) return null;
                const phaseId = phasesOf(row.id)[bar.index]?.id ?? '';
                const active = selection?.phaseId === phaseId;

                return (
                  <span
                    key={bar.id}
                    role="button"
                    tabIndex={focus?.rowIndex === rowIndex && focus?.barIndex === barIndex ? 0 : -1}
                    aria-label={timelineBarLabel(bar)}
                    data-bar={`${rowIndex}:${barIndex}`}
                    className={cn(
                      'absolute top-2 h-3.5 rounded-sm',
                      row.tone === 'income' ? 'bg-primary' : 'bg-muted-foreground/70',
                      active && 'ring-2 ring-ring',
                      !readOnly && 'cursor-grab',
                    )}
                    style={{
                      left: `${shape.left * 100}%`,
                      width: `${Math.max(shape.width * 100, 0.8)}%`,
                    }}
                    onPointerDown={(event) => onBarPointerDown(event, rowIndex, barIndex)}
                  >
                    {!readOnly && (
                      <>
                        <span
                          className="absolute inset-y-0 -left-1 w-2 cursor-ew-resize"
                          aria-hidden="true"
                          onPointerDown={(event) => onEdgePointerDown(event, bar, 'start')}
                        />
                        <span
                          className="absolute inset-y-0 -right-1 w-2 cursor-ew-resize"
                          aria-hidden="true"
                          onPointerDown={(event) => onEdgePointerDown(event, bar, 'end')}
                        />
                      </>
                    )}
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-1 flex border-t border-border pt-1">
          {ticks.map((tick) => (
            <span
              key={tick}
              className={cn(
                'flex-1 text-center font-mono text-[11px] tabular-nums text-muted-foreground',
                tick === anchorYear && 'font-semibold text-foreground',
              )}
            >
              {tick === anchorYear ? WORKSPACE_RAIL_LABELS.RETIREMENT_YEAR : tick}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
