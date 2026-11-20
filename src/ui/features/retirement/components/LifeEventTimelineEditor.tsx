import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/ui/components/ui/button';
import { TIMELINE_LABELS } from '@/ui/constants/retirement/eventLabels';
import { RULE_TYPE_LABELS } from '@/ui/constants/retirement/setupLabels';
import {
  WORKSPACE_ACTION_LABELS,
  WORKSPACE_RAIL_LABELS,
} from '@/ui/constants/retirement/workspaceRailLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';
import { LifeEventTimelineTrack } from '@/ui/features/retirement/components/LifeEventTimelineTrack';
import { RETIREMENT_YEAR_MARKER_CLASS } from '@/ui/features/retirement/components/timelineStyles';
import { useTimelineGesture } from '@/ui/features/retirement/components/useTimelineGesture';
import { type LifeEventDraftVM } from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';
import {
  DESKTOP_VISIBLE_YEARS,
  MOBILE_VISIBLE_YEARS,
  TIMELINE_PAN_STEPS,
  type TimelineFocus,
  type TimelineFocusKey,
  type TimelineRow,
  clampWindowStart,
  deriveTimelineRange,
  initialTimelineFocus,
  initialWindowStart,
  mapTimelineRows,
  moveTimelineFocus,
  panWindowStart,
  timelineFocusBar,
  timelineWindowBounds,
  windowStartToRevealBar,
} from '@/ui/features/retirement/viewmodels/retirementTimeline.vm';

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
  onCreate: (startYear: number, endYear: number, eventId: string | null) => void;
  onGestureStart: () => void;
  onRangeChange: (
    phaseId: string,
    targetEventId: string,
    startYear: number,
    endYear: number,
  ) => void;
}

const ROW_HEIGHT = 48;
/** Vertical breathing room above and below the bar inside a row. */
const BAR_TOP = 8;
const BAR_HEIGHT = ROW_HEIGHT - BAR_TOP * 2;

/**
 * Left edge kept free for the event name. The name sits on the same line as
 * the bar, so the years start after the gutter — and stay narrow enough on a
 * phone that five visible years still resolve a whole year per column.
 */
const GUTTER_DESKTOP = 96;
const GUTTER_MOBILE = 72;

const FOCUS_KEYS: TimelineFocusKey[] = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
];

/**
 * Editable life-event timeline. One row per event, one bar per phase, a fixed
 * window with pan only. Drags write to the draft on release; every gesture
 * pushes one undo entry through `onGestureStart`. The gesture machine lives in
 * `useTimelineGesture`, the drawing in `LifeEventTimelineTrack`.
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
  const isDesktop = useIsDesktop();
  const visibleYears = isDesktop ? DESKTOP_VISIBLE_YEARS : MOBILE_VISIBLE_YEARS;
  const gutter = isDesktop ? GUTTER_DESKTOP : GUTTER_MOBILE;
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
  const trackRef = useRef<HTMLDivElement>(null);
  /** The plotting area only — the gutter is not a year. */
  const plotRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const currentWindowStart = clampWindowStart(windowStart, bounds);

  /**
   * Brings a year range into the window. Run during render rather than in an
   * effect so no frame is painted at the old window.
   */
  const reveal = (startYear: number, endYear: number) =>
    setWindowStart((current) =>
      windowStartToRevealBar({ startYear, endYear }, current, visibleYears, bounds),
    );

  const [revealedYear, setRevealedYear] = useState<number | null>(null);
  if (revealYear !== null && revealYear !== revealedYear) {
    setRevealedYear(revealYear);
    reveal(revealYear, revealYear);
  }

  // Selecting a phase from outside the timeline (the rail, a row's ADD) has to
  // bring it into view too, or the click looks like it did nothing. The key
  // carries the years as well, so typing a year in the inspector drags the
  // window along instead of moving the bar out of sight.
  const selectedPhase =
    selection === null
      ? undefined
      : events
          .find((event) => event.id === selection.eventId)
          ?.phases.find((entry) => entry.id === selection.phaseId);
  const selectedStart = Number(selectedPhase?.startYearText);
  const selectedEnd = Number(selectedPhase?.endYearText);
  const revealKey =
    selection === null || !Number.isFinite(selectedStart)
      ? null
      : `${selection.phaseId}:${selectedStart}:${Number.isFinite(selectedEnd) ? selectedEnd : selectedStart}`;
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  if (revealKey !== null && revealKey !== revealedKey) {
    setRevealedKey(revealKey);
    reveal(selectedStart, Number.isFinite(selectedEnd) ? selectedEnd : selectedStart);
  }

  useEffect(() => {
    if (focus === null) return;
    trackRef.current
      ?.querySelector<HTMLElement>(`[data-bar="${focus.rowIndex}:${focus.barIndex}"]`)
      ?.focus();
  }, [focus]);

  const rows = useMemo<TimelineRow[]>(
    () =>
      mapTimelineRows(
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
              endYear: Number.isFinite(end)
                ? end
                : Number.isFinite(start)
                  ? start
                  : range.startYear,
            };
          }),
        })),
      ),
    [events, range.startYear],
  );

  const phases = (eventId: string) => events.find((event) => event.id === eventId)?.phases ?? [];
  const phaseIdAt = (eventId: string, barIndex: number) => phases(eventId)[barIndex]?.id ?? '';

  const anchorYear =
    retirementYear !== null && retirementYear >= range.startYear && retirementYear <= range.endYear
      ? retirementYear
      : null;

  const gesture = useTimelineGesture({
    rows,
    range,
    visibleYears,
    rowHeight: ROW_HEIGHT,
    readOnly,
    windowStart: currentWindowStart,
    plotRef,
    rowsRef,
    captureRef: trackRef,
    phaseIdAt,
    setFocus,
    onSelect,
    onCreate,
    onGestureStart,
    onRangeChange,
  });

  /** Roving tabindex: the arrows walk the bars, Enter selects the focused one. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!FOCUS_KEYS.includes(event.key as TimelineFocusKey)) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const bar = timelineFocusBar(rows, focus);
      if (bar === null) return;
      event.preventDefault();
      onSelect({ eventId: bar.eventId, phaseId: phaseIdAt(bar.eventId, bar.index) });
      return;
    }
    event.preventDefault();
    const from = focus ?? initialTimelineFocus(rows);
    if (from === null) return;
    const next = moveTimelineFocus(rows, from, event.key as TimelineFocusKey);
    setFocus(next);
    const bar = timelineFocusBar(rows, next);
    if (bar !== null) reveal(bar.startYear, bar.endYear);
  };

  const ticks: number[] = [];
  for (let year = currentWindowStart; year < currentWindowStart + visibleYears; year += 1) {
    ticks.push(year);
  }

  const pan = (step: number) => setWindowStart((current) => panWindowStart(current, step, bounds));

  return (
    <div data-testid="life-event-timeline-editor" className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="grid gap-0.5">
          <p className="text-xs text-muted-foreground">
            {selection === null
              ? WORKSPACE_ACTION_LABELS.EVENT_ADD_HINT_NEW
              : WORKSPACE_ACTION_LABELS.EVENT_ADD_HINT}
          </p>
          {anchorYear !== null && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`w-3 border-t ${RETIREMENT_YEAR_MARKER_CLASS}`} aria-hidden="true" />
              {WORKSPACE_RAIL_LABELS.RETIREMENT_YEAR} {retirementYear}
            </p>
          )}
          {anchorYear === null && retirementYear !== null && (
            <p className="text-[11px] text-muted-foreground">
              {WORKSPACE_RAIL_LABELS.RETIREMENT_YEAR} {retirementYear}
              <span className="ml-1">· {WORKSPACE_ACTION_LABELS.TIMELINE_OUTSIDE_VIEW}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 font-mono">
          {/* The coarse step sits on the outside, so the fine one is always nearest the bars. */}
          {[...TIMELINE_PAN_STEPS].reverse().map((step) => (
            <Button
              key={`left-${step}`}
              variant="text"
              size="sm"
              aria-label={TIMELINE_LABELS.PAN_BACK(step)}
              disabled={currentWindowStart <= bounds.minStart}
              onClick={() => pan(-step)}
            >
              {step === 1 ? '\u2039' : '\u00ab'}
            </Button>
          ))}
          {TIMELINE_PAN_STEPS.map((step) => (
            <Button
              key={`right-${step}`}
              variant="text"
              size="sm"
              aria-label={TIMELINE_LABELS.PAN_FORWARD(step)}
              disabled={currentWindowStart >= bounds.maxStart}
              onClick={() => pan(step)}
            >
              {step === 1 ? '\u203a' : '\u00bb'}
            </Button>
          ))}
        </div>
      </div>

      <LifeEventTimelineTrack
        rows={rows}
        ticks={ticks}
        windowStart={currentWindowStart}
        anchorYear={anchorYear}
        visibleYears={visibleYears}
        gutter={gutter}
        rowHeight={ROW_HEIGHT}
        barTop={BAR_TOP}
        barHeight={BAR_HEIGHT}
        readOnly={readOnly}
        selection={selection}
        focus={focus}
        trackRef={trackRef}
        plotRef={plotRef}
        rowsRef={rowsRef}
        phases={phases}
        onSelect={onSelect}
        gesture={gesture}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
