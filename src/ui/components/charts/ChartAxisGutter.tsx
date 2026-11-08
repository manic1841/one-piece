import { cn } from '@/ui/utils/cn';

/**
 * Width of a y-axis gutter, in px. Fits the 6-character tick cap.
 *
 * A gutter is the axis' own column, not an overlay: tick labels never cross the
 * plot, so a line or area cannot run through a number. `pointer-events-none`
 * keeps hover and scrub on the plot itself, whose coordinate space is unchanged.
 */
export const AXIS_GUTTER_CLASS = 'w-12';

type ChartAxisGutterProps = {
  /** Which side of the plot the axis sits on; sets the edge the labels hug. */
  side: 'left' | 'right';
  /** Tick labels, already ordered top to bottom. */
  labels: { y: number; text: string }[];
  /** Plot height in px, and the viewBox height the `y` values are measured in. */
  height: number;
  viewBoxHeight: number;
};

export function ChartAxisGutter({ side, labels, height, viewBoxHeight }: ChartAxisGutterProps) {
  return (
    <div
      data-testid={`chart-axis-${side}`}
      aria-hidden="true"
      className={cn('pointer-events-none relative shrink-0', AXIS_GUTTER_CLASS)}
      style={{ height }}
    >
      {labels.map((label, index) => (
        <span
          key={`${label.text}-${index}`}
          className={cn(
            'absolute -translate-y-1/2 font-mono text-[11px] tabular-nums text-muted-foreground',
            side === 'left' ? 'right-2' : 'left-2',
          )}
          style={{ top: `${(label.y / viewBoxHeight) * 100}%` }}
        >
          {label.text}
        </span>
      ))}
    </div>
  );
}
