import { useState } from 'react';

import { ChevronDown } from 'lucide-react';

import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PROJECTION_VIEW_LABELS } from '@/ui/constants/retirement/projectionLabels';
import { type SnapshotEventVM } from '@/ui/features/retirement/viewmodels/projectionView.vm';
import { cn } from '@/ui/utils/cn';

const BAR_ANIMATION = 'animate-[event-bar-grow_400ms_cubic-bezier(0.22,1,0.36,1)_both]';
const NODE_ANIMATION = 'animate-[event-node-pop_240ms_cubic-bezier(0.22,1,0.36,1)_both]';

/** Roughly eight labels, rounded to whole years, so the axis can be read at a glance. */
const TICK_TARGET = 8;

interface LifeEventTimelineProps {
  events: SnapshotEventVM[];
  startYear: number;
  endYear: number;
  /** Retirement year: the axis anchor and the marker splitting before / after. */
  retirementYear: number | null;
}

const ratio = (value: number, start: number, end: number): number => {
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (value - start) / (end - start)));
};

/**
 * Read-only event axis. One row per event: the name sits above a full-width
 * axis so the bar keeps the whole column, and the retiring year is drawn as a
 * marker so "before / after retirement" is read off the axis, not the copy.
 */
export function LifeEventTimeline({
  events,
  startYear,
  endYear,
  retirementYear,
}: LifeEventTimelineProps) {
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  const anchorYear =
    retirementYear !== null && retirementYear >= startYear && retirementYear <= endYear
      ? retirementYear
      : null;
  const ticks = (() => {
    const step = Math.max(1, Math.round((endYear - startYear) / (TICK_TARGET - 1)));
    const years = new Set<number>([startYear, endYear]);
    for (let year = startYear + step; year < endYear; year += step) years.add(year);
    if (anchorYear !== null) years.add(anchorYear);
    return [...years].sort((left, right) => left - right);
  })();

  return (
    <div data-testid="life-event-timeline">
      <div>
        {events.map((event) => {
          const isOpen = openEventId === event.id;

          return (
            <div key={event.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenEventId(isOpen ? null : event.id)}
                className="group block w-full px-0 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2">
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={cn(
                      'shrink-0 text-muted-foreground transition-transform duration-fast',
                      isOpen && 'rotate-180',
                    )}
                  />
                  <span className="min-w-0 truncate text-sm">{event.name}</span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {event.rangeText}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {event.timingText} · {event.typeText}
                    {event.isDisabled && ` · ${PROJECTION_VIEW_LABELS.EVENT_DISABLED}`}
                  </span>
                </span>

                <span className="relative mt-2 block h-2" aria-hidden="true">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                  {anchorYear !== null && (
                    <span
                      className="absolute inset-y-0 border-l border-dashed border-border-strong"
                      style={{ left: `${ratio(anchorYear, startYear, endYear) * 100}%` }}
                    />
                  )}
                  {event.phases.map((phase) => {
                    const left = ratio(phase.clippedStartYear, startYear, endYear);
                    const right = ratio(phase.clippedEndYear, startYear, endYear);
                    const isNode = phase.clippedStartYear === phase.clippedEndYear;
                    const tone = event.isOutside
                      ? 'bg-border-strong'
                      : event.isDisabled
                        ? 'bg-muted-foreground'
                        : 'bg-primary';

                    return isNode ? (
                      <span
                        key={`${event.id}-${phase.rangeText}`}
                        className={cn(
                          'absolute top-[0.5px] h-2 w-2 rounded-full ring-2 ring-background',
                          tone,
                          NODE_ANIMATION,
                        )}
                        style={{ left: `calc(${left * 100}% - 4px)` }}
                      />
                    ) : (
                      <span
                        key={`${event.id}-${phase.rangeText}`}
                        className={cn(
                          'absolute top-[1px] h-1.5 origin-left rounded-full',
                          tone,
                          BAR_ANIMATION,
                        )}
                        style={{
                          left: `${left * 100}%`,
                          width: `${Math.max((right - left) * 100, 0.4)}%`,
                        }}
                      />
                    );
                  })}
                </span>
              </button>

              {isOpen && (
                <div className="pb-3 pl-6" data-testid={`event-details-${event.id}`}>
                  <div className="grid grid-cols-[7rem_1fr_5rem] gap-x-3 border-b border-border pb-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <span>{PROJECTION_VIEW_LABELS.PHASE_RANGE}</span>
                    <span className="text-right">{PROJECTION_VIEW_LABELS.PHASE_AMOUNT}</span>
                    <span className="text-right">{PROJECTION_VIEW_LABELS.PHASE_GROWTH}</span>
                  </div>
                  {event.phases.map((phase) => (
                    <div
                      key={`${event.id}-detail-${phase.rangeText}`}
                      className="grid grid-cols-[7rem_1fr_5rem] gap-x-3 py-1 text-xs"
                    >
                      <span className="font-mono tabular-nums">{phase.rangeText}</span>
                      <span className="text-right font-mono tabular-nums">{phase.amountText}</span>
                      <span className="text-right font-mono tabular-nums">
                        {phase.growthRateText ?? PROJECTION_COMMON_LABELS.DASH}
                      </span>
                    </div>
                  ))}
                  {event.isClipped && (
                    <p className="pt-1 text-xs text-muted-foreground">
                      {PROJECTION_VIEW_LABELS.EVENT_CLIPPED}
                    </p>
                  )}
                  {event.isOutside && (
                    <p className="pt-1 text-xs text-muted-foreground">
                      {PROJECTION_VIEW_LABELS.EVENT_OUTSIDE}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="relative h-5 border-t border-border" aria-hidden="true">
        {ticks.map((tick) => {
          const isMajor = tick === startYear || tick === endYear || tick === anchorYear;
          return (
            <span
              key={tick}
              className={cn(
                'absolute top-1 font-mono text-[10px] tabular-nums text-muted-foreground',
                // Narrow screens only keep the period edges and the anchor.
                !isMajor && 'hidden md:block',
                tick === anchorYear && 'font-semibold text-foreground',
              )}
              style={{
                left: `${ratio(tick, startYear, endYear) * 100}%`,
                transform: `translateX(${tick === startYear ? 0 : tick === endYear ? -100 : -50}%)`,
              }}
            >
              {tick === anchorYear ? PROJECTION_VIEW_LABELS.AXIS_RETIREMENT : tick}
            </span>
          );
        })}
      </div>

      <p className="sr-only">{PROJECTION_VIEW_LABELS.EVENTS_SECTION}</p>
    </div>
  );
}
