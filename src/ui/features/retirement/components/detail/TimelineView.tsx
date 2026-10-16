import React, { useEffect, useRef, useState } from 'react';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';

import { EmptyState } from '@/ui/components/EmptyState';
import { Skeleton } from '@/ui/components/Skeleton';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  RetirementEventsLabels as L,
  RetirementTimelineLabels as T,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import type {
  RetirementEventItemVM,
  RetirementOneTimeEvent,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import {
  DESKTOP_VISIBLE_YEARS,
  MOBILE_VISIBLE_YEARS,
  TIMELINE_DRAG_THRESHOLD_PX,
  TIMELINE_PAN_STEPS,
  type TimelineBar,
  type TimelineDraft,
  type TimelineFocus,
  type TimelineFocusKey,
  type TimelineRange,
  type TimelineRow,
  barGeometry,
  clampWindowStart,
  createDraftFromRange,
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
  yearsToPanDelta,
} from '@/ui/features/retirement/viewmodels/retirementTimeline.vm';
import { cn } from '@/ui/utils/cn';

import { EventEntryEditor } from '../EventEntryEditor';
import { PhaseEntryEditor } from '../PhaseEntryEditor';

type RetirementEventPhase = RetirementOneTimeEvent['phases'][number];
type EventItem = { domain: RetirementOneTimeEvent; vm: RetirementEventItemVM };

/** Tone → bar 著色（spec #301 §5.1：tone 辨識收入／支出、不顯示金額）。 */
const TONE_BAR: Record<TimelineRow['tone'], string> = {
  income: 'bg-positive/25 border-positive text-positive',
  expense: 'bg-negative/25 border-negative text-negative',
};

const KEY_TO_FOCUS: Record<string, TimelineFocusKey> = {
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  Home: 'Home',
  End: 'End',
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/** md 以上為桌面外殼（ADR-0044）。 */
const useIsMobile = (): boolean => {
  const query = '(max-width: 767px)';
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
};

interface Gesture {
  kind: 'pan' | 'press';
  pointerId: number;
  rectLeft: number;
  rectWidth: number;
  startX: number;
  startY: number;
  moved: boolean;
  baseWindowStart: number;
  origin: 'empty' | 'phase' | 'handle';
  eventId: string;
  index: number;
  anchorYear: number;
  edge?: 'start' | 'end';
  origStart?: number;
  origEnd?: number;
  startWindowStart?: number;
  rows: Array<{ id: string; top: number; bottom: number }>;
}

type EditorTarget =
  | { mode: 'edit'; eventId: string; index: number }
  | { mode: 'create'; eventId: string; range: { startYear: number; endYear: number } };

export interface TimelineViewProps {
  currentYear: number;
  range: TimelineRange;
  eventItems: EventItem[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onAddEvent: (data: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  /** 側邊編輯器（明示 Save）路徑：不給 Undo（spec #301 §2.4）。 */
  onAddPhase: (eventId: string, phase: RetirementEventPhase) => Promise<void>;
  onUpdatePhase: (
    eventId: string,
    phaseIndex: number,
    phase: RetirementEventPhase,
  ) => Promise<void>;
  /** 拖曳（移動／調整端點／跨列歸組）：可 Undo（spec #301 §2.4）。 */
  onTimelineUpdatePhase: (
    eventId: string,
    phaseIndex: number,
    patch: { startYear: number; endYear: number; targetEventId?: string },
  ) => Promise<void>;
}

/**
 * Life Events Timeline（spec #301 §5.1 Timeline 側、§5.3–§5.5）。
 *
 * 固定視窗（桌面 10 年／行動 5 年）、無縮放；每 phase 一條 bar、依 Event 分列、tone
 * 著色、不顯示金額。桌面手勢（空白建立／移動整段含換 Event／端點 resize／拖年份尺
 * 平移）與鍵盤 roving tabindex 導覽；行動版僅具名控制（◀▶ 平移、每列新增階段、編輯器
 * 內換 Event）。視窗範圍由 plan 推導；選取以 id 保留、實體不存在則清空。
 */
export function TimelineView({
  currentYear,
  range,
  eventItems,
  loading,
  error,
  onRetry,
  onAddEvent,
  onAddPhase,
  onUpdatePhase,
  onTimelineUpdatePhase,
}: TimelineViewProps) {
  const isMobile = useIsMobile();
  const visibleYears = isMobile ? MOBILE_VISIBLE_YEARS : DESKTOP_VISIBLE_YEARS;
  const bounds = timelineWindowBounds(range, visibleYears);

  const [rawWindowStart, setRawWindowStart] = useState(() =>
    initialWindowStart(range, currentYear, visibleYears),
  );
  const [panDraft, setPanDraft] = useState<number | null>(null);
  const windowStart = clampWindowStart(panDraft ?? rawWindowStart, bounds);

  const [focus, setFocus] = useState<TimelineFocus | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<TimelineDraft | null>(null);
  const [editor, setEditor] = useState<EditorTarget | null>(null);

  const rows: TimelineRow[] = mapTimelineRows(
    eventItems.map(({ domain, vm }) => ({
      id: vm.id,
      name: vm.name,
      type: domain.type,
      phases: vm.phases.map((phase) => ({
        name: phase.name,
        startYear: phase.startYear,
        endYear: phase.endYear,
        index: phase.index,
      })),
    })),
  );

  const displayRows: TimelineRow[] = applyDraftToRows(rows, draft);

  // Selection persistence by id (spec #301 §5.4): cleared when the entity is gone.
  const barIds = new Set(displayRows.flatMap((row) => row.bars.map((bar) => bar.id)));
  const selected = selectedKey !== null && barIds.has(selectedKey) ? selectedKey : null;

  const activeFocus = focus ?? initialTimelineFocus(rows);

  const plotRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef(new Map<string, HTMLDivElement>());
  const gestureRef = useRef<Gesture | null>(null);
  const dismissClickUntilRef = useRef(0);

  // Latest-value mirrors so the single-instance window listeners never go stale.
  const latest = useRef({ windowStart, visibleYears, range, isMobile });
  useEffect(() => {
    latest.current = { windowStart, visibleYears, range, isMobile };
  }, [windowStart, visibleYears, range, isMobile]);

  /* ---------------------------- panning ---------------------------- */

  const panBy = (delta: number) =>
    setRawWindowStart((start) => panWindowStart(start, delta, bounds));

  /* --------------------------- gestures ---------------------------- */

  const begin = (
    event: React.PointerEvent,
    context: {
      kind: 'pan' | 'press';
      origin: 'empty' | 'phase' | 'handle';
      eventId: string;
      index: number;
      anchorYear: number;
      edge?: 'start' | 'end';
      origStart?: number;
      origEnd?: number;
    },
  ) => {
    const plot = plotRef.current;
    if (!plot) return;
    const rect = plot.getBoundingClientRect();
    const gestureRows = Array.from(
      boardRef.current?.querySelectorAll<HTMLElement>('[data-event-row]') ?? [],
    ).map((element) => {
      const rowRect = element.getBoundingClientRect();
      return { id: element.dataset.eventRow ?? '', top: rowRect.top, bottom: rowRect.bottom };
    });
    gestureRef.current = {
      ...context,
      pointerId: event.pointerId,
      rectLeft: rect.left,
      rectWidth: rect.width,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      baseWindowStart: latest.current.windowStart,
      startWindowStart: latest.current.windowStart,
      rows: gestureRows,
    };
    event.stopPropagation();
  };

  const updateDraft = (gesture: Gesture, clientX: number, clientY: number) => {
    const { visibleYears: years, range: currentRange } = latest.current;
    const cellWidth = gesture.rectWidth / years;
    const yearAt = (x: number): number =>
      gesture.baseWindowStart + clamp(Math.floor((x - gesture.rectLeft) / cellWidth), 0, years - 1);

    if (gesture.kind === 'pan') {
      const delta = yearsToPanDelta(clientX - gesture.startX, gesture.rectWidth, years);
      const boundsNow = timelineWindowBounds(currentRange, years);
      setPanDraft(
        clampWindowStart((gesture.startWindowStart ?? gesture.baseWindowStart) - delta, boundsNow),
      );
      return;
    }

    if (gesture.origin === 'empty') {
      setDraft(createDraftFromRange(gesture.eventId, gesture.anchorYear, yearAt(clientX)));
      return;
    }
    if (gesture.origin === 'handle') {
      setDraft(
        resizeDraftFromEdge({
          eventId: gesture.eventId,
          index: gesture.index,
          edge: gesture.edge ?? 'start',
          origStart: gesture.origStart ?? yearAt(clientX),
          origEnd: gesture.origEnd ?? yearAt(clientX),
          year: yearAt(clientX),
        }),
      );
      return;
    }
    const delta = yearsToPanDelta(clientX - gesture.startX, gesture.rectWidth, years);
    const row = gesture.rows.find((entry) => clientY >= entry.top && clientY <= entry.bottom);
    setDraft(
      moveDraftFromDelta({
        eventId: gesture.eventId,
        index: gesture.index,
        targetEventId: row?.id ?? gesture.eventId,
        origStart: gesture.origStart ?? 0,
        origEnd: gesture.origEnd ?? 0,
        deltaYears: delta,
        range: currentRange,
      }),
    );
  };

  const openEditorForBar = (bar: { eventId: string; index: number }) => {
    setEditor({ mode: 'edit', eventId: bar.eventId, index: bar.index });
  };

  const finish = (gesture: Gesture) => {
    if (gesture.kind === 'pan') {
      setRawWindowStart((start) => clampWindowStart(panDraft ?? start, bounds));
      setPanDraft(null);
      return;
    }
    if (!gesture.moved) {
      if (gesture.origin === 'empty') {
        setEditor({
          mode: 'create',
          eventId: gesture.eventId,
          range: { startYear: gesture.anchorYear, endYear: gesture.anchorYear },
        });
      } else if (gesture.origin === 'phase') {
        openEditorForBar({ eventId: gesture.eventId, index: gesture.index });
      }
      return;
    }
    setDraft((current) => {
      if (!current) return null;
      if (current.kind === 'create') {
        setEditor({
          mode: 'create',
          eventId: current.eventId,
          range: { startYear: current.startYear, endYear: current.endYear },
        });
      } else if (current.kind === 'resize') {
        void onTimelineUpdatePhase(current.eventId, current.index, {
          startYear: current.startYear,
          endYear: current.endYear,
        });
        setSelectedKey(`${current.eventId}:${current.index}`);
      } else {
        void onTimelineUpdatePhase(current.fromEventId, current.index, {
          startYear: current.startYear,
          endYear: current.endYear,
          targetEventId: current.targetEventId,
        });
        setSelectedKey(`${current.targetEventId}:${current.index}`);
      }
      return null;
    });
  };

  const updateDraftRef = useRef(updateDraft);
  const finishRef = useRef(finish);
  useEffect(() => {
    updateDraftRef.current = updateDraft;
    finishRef.current = finish;
  }, [updateDraft, finish]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      if (
        !gesture.moved &&
        Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >
          TIMELINE_DRAG_THRESHOLD_PX
      ) {
        gesture.moved = true;
      }
      if (gesture.moved || gesture.kind === 'pan') {
        updateDraftRef.current(gesture, event.clientX, event.clientY);
      }
    };
    const onUp = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      finishRef.current(gesture);
      if (gesture.kind !== 'pan' && gesture.moved) {
        dismissClickUntilRef.current = performance.now() + 350;
      }
      gestureRef.current = null;
      setDraft(null);
    };
    const onCancel = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      gestureRef.current = null;
      setDraft(null);
      setPanDraft(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, []);

  /* ---------------------------- keyboard --------------------------- */

  /** 焦點落視窗外即時平移（無動畫，spec #301 §5.4）。 */
  const revealBar = (bar: TimelineBar) => {
    const revealed = windowStartToRevealBar(bar, windowStart, visibleYears, bounds);
    if (revealed !== windowStart) setRawWindowStart(revealed);
  };

  const moveFocusTo = (next: TimelineFocus) => {
    const bar = timelineFocusBar(rows, next);
    if (!bar) return;
    setFocus(next);
    revealBar(bar);
    barRefs.current.get(bar.id)?.focus();
  };

  const onBarKeyDown = (event: React.KeyboardEvent, position: TimelineFocus) => {
    const key = KEY_TO_FOCUS[event.key];
    if (key) {
      event.preventDefault();
      moveFocusTo(moveTimelineFocus(rows, position, key));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const bar = rows[position.rowIndex]?.bars[position.barIndex];
      if (bar) openEditorForBar(bar);
    }
  };

  /* ----------------------------- render ---------------------------- */

  if (loading) {
    return (
      <div role="status" className="space-y-2 py-2">
        <span className="sr-only">{L.loadingLabel}</span>
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-12" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="warning">
        <AlertDescription>{L.loadError}</AlertDescription>
        <Button variant="text" className="ml-auto shrink-0" onClick={onRetry}>
          {L.retryAction}
        </Button>
      </Alert>
    );
  }

  if (eventItems.length === 0) {
    return (
      <EmptyState
        title={L.emptyTitle}
        description={L.emptyDescription}
        action={<EventEntryEditor currentYear={currentYear} onSave={onAddEvent} />}
      />
    );
  }

  const editorItem = editor
    ? eventItems.find((item) => item.domain.id === editor.eventId)
    : undefined;

  return (
    <div className="space-y-3">
      <div className="select-none rounded-lg border border-border" ref={boardRef}>
        {/* WINDOW controls — 鍵盤與行動版的平移入口（spec #301 §5.3）。 */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2">
          <span className={eyebrowClass}>{T.windowLabel}</span>
          <span className="font-mono text-xs tabular-nums">
            {windowStart}–{windowStart + visibleYears - 1}
          </span>
          <div className="ml-auto flex items-center gap-1">
            {TIMELINE_PAN_STEPS.filter((step) => !isMobile || step === 1).map((step) => (
              <Button
                key={`back-${step}`}
                size="icon"
                variant="outline"
                aria-label={T.panBackAria(step)}
                disabled={windowStart <= bounds.minStart}
                onClick={() => panBy(-step)}
              >
                {step === 1 ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronsLeft className="h-4 w-4" />
                )}
              </Button>
            ))}
            {TIMELINE_PAN_STEPS.filter((step) => !isMobile || step === 1).map((step) => (
              <Button
                key={`fwd-${step}`}
                size="icon"
                variant="outline"
                aria-label={T.panForwardAria(step)}
                disabled={windowStart >= bounds.maxStart}
                onClick={() => panBy(step)}
              >
                {step === 1 ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronsRight className="h-4 w-4" />
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Year ruler — 裝飾（不聚焦、無 role）；桌面拖曳平移（spec #301 §5.4）。 */}
        <div className="flex border-b border-border">
          <div className="hidden w-44 shrink-0 border-r border-border px-3 py-2 md:block">
            <span className={eyebrowClass}>{T.eventYearColumn}</span>
          </div>
          <div
            ref={plotRef}
            aria-hidden="true"
            onPointerDown={(event) => {
              if (isMobile) return;
              begin(event, {
                kind: 'pan',
                origin: 'empty',
                eventId: '',
                index: -1,
                anchorYear: 0,
              });
            }}
            style={{ gridTemplateColumns: `repeat(${visibleYears}, minmax(0, 1fr))` }}
            className={cn(
              'relative grid flex-1',
              !isMobile && 'cursor-grab touch-none active:cursor-grabbing',
            )}
          >
            {Array.from({ length: visibleYears }, (_, i) => windowStart + i).map((year) => (
              <div
                key={year}
                className="border-l border-border/60 py-2 text-center font-mono text-[11px] tabular-nums text-muted-foreground first:border-l-0"
              >
                {year}
              </div>
            ))}
          </div>
        </div>

        {/* Rows — one per Event. */}
        {displayRows.map((row, rowIndex) => {
          const isTarget =
            draft?.kind === 'move' &&
            draft.targetEventId === row.id &&
            draft.fromEventId !== row.id;
          return (
            <div
              key={row.id}
              role="group"
              aria-label={row.name}
              data-event-row={row.id}
              className={cn(
                'border-b border-border last:border-b-0 md:flex',
                isTarget && 'bg-accent/40 ring-1 ring-inset ring-ring',
              )}
            >
              <div className="flex items-center justify-between gap-2 px-3 pt-2 md:w-44 md:shrink-0 md:border-r md:border-border md:px-3 md:py-3">
                <span className="truncate text-sm">{row.name}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className={cn(
                      'font-mono text-[10px]',
                      row.tone === 'income' ? 'text-positive' : 'text-negative',
                    )}
                    aria-hidden="true"
                  >
                    {row.tone === 'income' ? '+' : '−'}
                  </span>
                  {/* Create Phase 具名控制（鍵盤可達，#292 硬依賴）。 */}
                  <PhaseEntryEditor
                    eventName={row.name}
                    currentYear={currentYear}
                    onSave={(phase) => onAddPhase(row.id, phase)}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={T.addPhaseAction}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                </div>
              </div>
              <div
                className="relative h-12 flex-1 overflow-hidden px-1 py-1 md:h-14 md:px-0 md:py-0"
                onPointerDown={(event) => {
                  if (isMobile) return;
                  begin(event, {
                    kind: 'press',
                    origin: 'empty',
                    eventId: row.id,
                    index: -1,
                    anchorYear: 0,
                  });
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 grid"
                  style={{ gridTemplateColumns: `repeat(${visibleYears}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: visibleYears }, (_, i) => windowStart + i).map((year) => (
                    <div key={year} className="border-l border-border/40 first:border-l-0" />
                  ))}
                </div>

                {row.bars.map((bar, barIndex) => {
                  const geometry = barGeometry(bar, windowStart, visibleYears);
                  const position: TimelineFocus = { rowIndex, barIndex };
                  const isFocused =
                    activeFocus?.rowIndex === rowIndex && activeFocus?.barIndex === barIndex;
                  const isDraftBar =
                    bar.id === 'draft:create' ||
                    (draft !== null &&
                      draft.kind !== 'create' &&
                      bar.eventId === draft.eventId &&
                      bar.index === draft.index);
                  const isSelected = selected === bar.id;
                  return (
                    <div
                      key={bar.id}
                      ref={(element) => {
                        if (element) barRefs.current.set(bar.id, element);
                        else barRefs.current.delete(bar.id);
                      }}
                      role="button"
                      tabIndex={isFocused ? 0 : -1}
                      aria-label={timelineBarLabel(bar)}
                      onFocus={() => {
                        setFocus(position);
                        revealBar(bar);
                      }}
                      onKeyDown={(event) => onBarKeyDown(event, position)}
                      onPointerDown={(event) => {
                        if (bar.index < 0) return;
                        // 行動版僅具名控制：不拖曳，點擊開啟編輯器。
                        if (isMobile) {
                          event.stopPropagation();
                          return;
                        }
                        const phase = editorPhaseAt(eventItems, bar.eventId, bar.index);
                        if (!phase) return;
                        begin(event, {
                          kind: 'press',
                          origin: 'phase',
                          eventId: bar.eventId,
                          index: bar.index,
                          anchorYear: bar.startYear,
                          origStart: phase.startYear,
                          origEnd: phase.endYear,
                        });
                      }}
                      onClick={(event) => {
                        if (!isMobile || bar.index < 0) return;
                        if (performance.now() < dismissClickUntilRef.current) return;
                        event.stopPropagation();
                        openEditorForBar(bar);
                      }}
                      style={{
                        left: `${geometry.left * 100}%`,
                        width: `${geometry.width * 100}%`,
                      }}
                      className={cn(
                        'absolute inset-y-2 flex items-center gap-0.5 rounded border px-1 text-left text-[11px] md:gap-1',
                        TONE_BAR[bar.tone],
                        isDraftBar && 'opacity-70 ring-1 ring-ring',
                        isSelected && 'ring-2 ring-ring',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                      )}
                    >
                      <span
                        data-handle="start"
                        aria-hidden="true"
                        onPointerDown={(event) => {
                          if (bar.index < 0 || isMobile) return;
                          const phase = editorPhaseAt(eventItems, bar.eventId, bar.index);
                          if (!phase) return;
                          event.stopPropagation();
                          begin(event, {
                            kind: 'press',
                            origin: 'handle',
                            eventId: bar.eventId,
                            index: bar.index,
                            anchorYear: bar.startYear,
                            edge: 'start',
                            origStart: phase.startYear,
                            origEnd: phase.endYear,
                          });
                        }}
                        className="h-full w-3 shrink-0 cursor-ew-resize touch-none rounded bg-current opacity-60 md:w-1.5"
                      />
                      <span className="min-w-0 flex-1 truncate">{bar.name}</span>
                      <span
                        data-handle="end"
                        aria-hidden="true"
                        onPointerDown={(event) => {
                          if (bar.index < 0 || isMobile) return;
                          const phase = editorPhaseAt(eventItems, bar.eventId, bar.index);
                          if (!phase) return;
                          event.stopPropagation();
                          begin(event, {
                            kind: 'press',
                            origin: 'handle',
                            eventId: bar.eventId,
                            index: bar.index,
                            anchorYear: bar.endYear - 1,
                            edge: 'end',
                            origStart: phase.startYear,
                            origEnd: phase.endYear,
                          });
                        }}
                        className="h-full w-3 shrink-0 cursor-ew-resize touch-none rounded bg-current opacity-60 md:w-1.5"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {editor && editorItem && (
        <PhaseEntryEditor
          key={`${editor.mode}-${editor.eventId}-${editor.mode === 'edit' ? editor.index : 'new'}`}
          open
          onOpenChange={(next) => {
            if (!next) setEditor(null);
          }}
          eventName={editorItem.domain.name}
          currentYear={currentYear}
          initialData={editor.mode === 'edit' ? editorItem.domain.phases[editor.index] : undefined}
          initialRange={editor.mode === 'create' ? editor.range : undefined}
          reassign={
            editor.mode === 'edit'
              ? {
                  value: editor.eventId,
                  options: eventItems.map((item) => ({
                    value: item.domain.id,
                    label: item.domain.name,
                  })),
                  onChange: (targetEventId) => {
                    if (targetEventId === editor.eventId) return;
                    const phase = editorItem.domain.phases[editor.index];
                    if (!phase) return;
                    void onTimelineUpdatePhase(editor.eventId, editor.index, {
                      startYear: phase.startYear,
                      endYear: phase.endYear,
                      targetEventId,
                    });
                    setSelectedKey(`${targetEventId}:${editor.index}`);
                    setEditor(null);
                  },
                }
              : undefined
          }
          onSave={
            editor.mode === 'edit'
              ? (phase) => onUpdatePhase(editor.eventId, editor.index, phase)
              : (phase) => onAddPhase(editor.eventId, phase)
          }
        />
      )}
    </div>
  );
}

/** 取得某事件在指定索引的完整 domain phase（供拖曳起始值與編輯器初值）。 */
function editorPhaseAt(
  eventItems: EventItem[],
  eventId: string,
  index: number,
): RetirementEventPhase | undefined {
  return eventItems.find((item) => item.domain.id === eventId)?.domain.phases[index];
}

/** 把拖曳草稿（建立／移動／調整端點）套到列上，供即時預覽（spec #301 §5.4）。 */
function applyDraftToRows(rows: TimelineRow[], draft: TimelineDraft | null): TimelineRow[] {
  if (!draft) return rows;
  if (draft.kind === 'create') {
    return rows.map((row) =>
      row.id === draft.eventId
        ? {
            ...row,
            bars: [
              ...row.bars,
              {
                id: 'draft:create',
                eventId: draft.eventId,
                index: -1,
                name: '',
                tone: row.tone,
                startYear: draft.startYear,
                endYear: draft.endYear,
              },
            ],
          }
        : row,
    );
  }
  return rows.map((row) => {
    if (draft.kind === 'resize') {
      return {
        ...row,
        bars: row.bars.map((bar) =>
          bar.eventId === draft.eventId && bar.index === draft.index
            ? { ...bar, startYear: draft.startYear, endYear: draft.endYear }
            : bar,
        ),
      };
    }
    const found = rows
      .flatMap((candidate) => candidate.bars)
      .find((bar) => bar.eventId === draft.eventId && bar.index === draft.index);
    if (!found) return row;
    const moved = { ...found, startYear: draft.startYear, endYear: draft.endYear };
    let bars = row.bars.filter(
      (bar) => !(bar.eventId === draft.eventId && bar.index === draft.index),
    );
    if (row.id === draft.targetEventId) {
      bars = [...bars, moved].sort((a, b) => a.startYear - b.startYear);
    }
    return { ...row, bars };
  });
}
