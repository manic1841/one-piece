import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  type BarGeometry,
  type TimelineBar,
} from '@/ui/features/retirement/viewmodels/retirementTimeline.vm';
import { timelineBarLabel } from '@/ui/features/retirement/viewmodels/retirementTimeline.vm';
import { cn } from '@/ui/utils/cn';

interface LifeEventTimelineBarProps {
  bar: TimelineBar;
  shape: BarGeometry;
  /** `rowIndex:barIndex`, the roving-tabindex lookup key. */
  slot: string;
  left: number;
  top: number;
  height: number;
  tone: 'income' | 'expense';
  selected: boolean;
  focusable: boolean;
  dragging: boolean;
  readOnly: boolean;
  onPress: () => void;
  onPointerDown: (event: React.PointerEvent) => void;
  onEdgePointerDown: (event: React.PointerEvent, edge: 'start' | 'end') => void;
}

/**
 * One phase bar. A clipped end is drawn as a cut (dashed edge plus arrow) so a
 * bar that crosses the window boundary does not read as ending there.
 */
export function LifeEventTimelineBar({
  bar,
  shape,
  slot,
  left,
  top,
  height,
  tone,
  selected,
  focusable,
  dragging,
  readOnly,
  onPress,
  onPointerDown,
  onEdgePointerDown,
}: LifeEventTimelineBarProps) {
  return (
    <span
      role="button"
      tabIndex={focusable ? 0 : -1}
      aria-label={timelineBarLabel(bar)}
      data-bar={slot}
      className={cn(
        'absolute flex items-center gap-0.5 overflow-hidden border px-1 text-[11px] leading-none',
        tone === 'income'
          ? 'border-positive/70 bg-positive/20 text-positive hover:bg-positive/35'
          : 'border-negative/70 bg-negative/20 text-negative hover:bg-negative/35',
        shape.clippedStart ? 'rounded-l-none border-l-dashed' : 'rounded-l-sm',
        shape.clippedEnd ? 'rounded-r-none border-r-dashed' : 'rounded-r-sm',
        selected && 'ring-2 ring-ring',
        dragging && 'z-10',
        !readOnly && 'cursor-grab',
      )}
      style={{ left: `${left}%`, width: `${Math.max(shape.width * 100, 0.8)}%`, top, height }}
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          // The track has its own Enter handling for the roving focus.
          event.preventDefault();
          event.stopPropagation();
          onPress();
        }
      }}
    >
      {shape.clippedStart && <ChevronLeft size={9} className="shrink-0" aria-hidden="true" />}
      <span className="truncate">{bar.name}</span>
      {shape.clippedEnd && <ChevronRight size={9} className="shrink-0" aria-hidden="true" />}
      {!readOnly && (
        <>
          <span
            className="absolute inset-y-0 -left-1 w-2 cursor-ew-resize"
            aria-hidden="true"
            onPointerDown={(event) => onEdgePointerDown(event, 'start')}
          />
          <span
            className="absolute inset-y-0 -right-1 w-2 cursor-ew-resize"
            aria-hidden="true"
            onPointerDown={(event) => onEdgePointerDown(event, 'end')}
          />
        </>
      )}
    </span>
  );
}
