import { TIMELINE_LABELS } from '@/ui/constants/retirement/eventLabels';
import { RULE_TYPE_LABELS } from '@/ui/constants/retirement/setupLabels';
import { LifeEventTimelineBar } from '@/ui/features/retirement/components/LifeEventTimelineBar';
import { RETIREMENT_YEAR_MARKER_CLASS } from '@/ui/features/retirement/components/timelineStyles';
import { type TimelineGesture } from '@/ui/features/retirement/components/useTimelineGesture';
import {
  type TimelineBar,
  type TimelineFocus,
  type TimelineRow,
  barGeometry,
} from '@/ui/features/retirement/viewmodels/retirementTimeline.vm';
import { cn } from '@/ui/utils/cn';

interface LifeEventTimelineTrackProps {
  rows: TimelineRow[];
  ticks: number[];
  windowStart: number;
  anchorYear: number | null;
  visibleYears: number;
  /** Width of the name gutter; the years start after it. */
  gutter: number;
  rowHeight: number;
  barTop: number;
  barHeight: number;
  readOnly: boolean;
  selection: { phaseId: string } | null;
  focus: TimelineFocus | null;
  trackRef: React.RefObject<HTMLDivElement | null>;
  plotRef: React.RefObject<HTMLDivElement | null>;
  rowsRef: React.RefObject<HTMLDivElement | null>;
  phases: (eventId: string) => { id: string }[];
  onSelect: (selection: { eventId: string; phaseId: string }) => void;
  gesture: TimelineGesture;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/** The timeline body: grid, one row per event, the axis. Editable chrome only. */
export function LifeEventTimelineTrack({
  rows,
  ticks,
  windowStart,
  anchorYear,
  visibleYears,
  gutter,
  rowHeight,
  barTop,
  barHeight,
  readOnly,
  selection,
  focus,
  trackRef,
  plotRef,
  rowsRef,
  phases,
  onSelect,
  gesture,
  onKeyDown,
}: LifeEventTimelineTrackProps) {
  const { gesture: active, preview } = gesture;
  const toneOf = (row: TimelineRow) =>
    row.name.trim() === '' ? RULE_TYPE_LABELS[row.tone] : row.name;

  const renderBar = (row: TimelineRow, bar: TimelineBar, rowIndex: number, barIndex: number) => {
    const shape = barGeometry(preview(bar), windowStart, visibleYears);
    if (!shape.visible) return null;
    const phaseId = phases(row.id)[bar.index]?.id ?? '';

    return (
      <LifeEventTimelineBar
        key={bar.id}
        bar={bar}
        shape={shape}
        slot={`${rowIndex}:${barIndex}`}
        left={shape.left * 100}
        top={barTop}
        height={barHeight}
        tone={row.tone}
        selected={selection?.phaseId === phaseId}
        focusable={focus?.rowIndex === rowIndex && focus?.barIndex === barIndex}
        dragging={active !== null && active.kind !== 'create' && active.phaseId === phaseId}
        readOnly={readOnly}
        onPress={() => onSelect({ eventId: bar.eventId, phaseId })}
        onPointerDown={(event) => gesture.onBarPointerDown(event, rowIndex, barIndex)}
        onEdgePointerDown={(event, edge) => gesture.onEdgePointerDown(event, bar, edge)}
      />
    );
  };
  const windowEnd = windowStart + visibleYears - 1;

  return (
    <div
      ref={trackRef}
      role="toolbar"
      aria-label={TIMELINE_LABELS.TRACK}
      className={cn(
        'relative grid select-none border-y border-border py-1',
        !readOnly && 'cursor-crosshair',
      )}
      onPointerDown={gesture.onBackgroundPointerDown}
      onPointerMove={gesture.onPointerMove}
      onPointerUp={gesture.settle}
      onPointerCancel={gesture.cancel}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <div
        ref={plotRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 grid"
        style={{ left: gutter }}
      >
        {ticks.map((tick) => (
          <span
            key={tick}
            className={cn(
              'border-l border-border/60',
              tick === anchorYear && RETIREMENT_YEAR_MARKER_CLASS,
            )}
            style={{ gridColumn: tick - windowStart + 1 }}
          />
        ))}
      </div>

      <div ref={rowsRef} data-testid="timeline-rows">
        {rows.map((row, rowIndex) => (
          <div
            key={row.id}
            className={cn(
              'group relative flex transition-colors duration-fast',
              active !== null && active.kind !== 'create' && active.targetEventId === row.id
                ? 'bg-accent/40'
                : 'hover:bg-accent/20',
            )}
            style={{ height: rowHeight }}
          >
            <span
              title={toneOf(row)}
              className="pointer-events-none flex shrink-0 items-center px-1 text-[11px] leading-4 text-muted-foreground transition-colors duration-fast group-hover:text-foreground"
              style={{ width: gutter }}
            >
              <span className="truncate">{toneOf(row)}</span>
            </span>

            <div className="relative flex-1">
              {row.bars.map((bar, barIndex) => renderBar(row, bar, rowIndex, barIndex))}
              {(() => {
                const outsideBar = row.bars.find(
                  (bar) => !barGeometry(bar, windowStart, visibleYears).visible,
                );
                if (outsideBar === undefined) return null;
                const afterWindow = outsideBar.startYear > windowEnd;
                return (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute top-1/2 -translate-y-1/2 font-mono text-[11px] tabular-nums text-muted-foreground',
                      afterWindow ? 'right-1' : 'left-1',
                    )}
                  >
                    {afterWindow ? `${outsideBar.startYear} →` : `← ${outsideBar.endYear}`}
                  </span>
                );
              })()}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1 flex border-t border-border pt-1">
        <span aria-hidden="true" style={{ width: gutter }} />
        <div className="flex flex-1">
          {ticks.map((tick) => (
            <span
              key={tick}
              className={cn(
                'flex-1 text-center font-mono text-[11px] tabular-nums text-muted-foreground',
                tick === anchorYear && 'font-semibold text-foreground',
              )}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
