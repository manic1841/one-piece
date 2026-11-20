/**
 * y-axis label fixes shared by the axis-drawing charts.
 *
 * A padded scale can leave the zero baseline between two gridlines, so the
 * baseline gets its own label; the ticks it would collide with are dropped.
 */

/** Minimum gap between the zero-baseline label and a normal tick label, in px. */
const ZERO_LABEL_KEEP_AWAY = 20;
/** Closer than this, a normal tick already labels the baseline. */
const ZERO_LABEL_COLLISION = 10;

/** Below this plot height there is no room for four tick labels. */
export const SHORT_PLOT_HEIGHT = 140;
/** Tick count used under {@link SHORT_PLOT_HEIGHT}. */
export const SHORT_PLOT_TICKS = 3;

/**
 * Tick count for a rendered plot height: the caller's pin wins, otherwise a short
 * plot thins out and a tall one keeps the geometry default.
 */
export const tickCountForHeight = (height: number, pinned?: number): number | undefined =>
  pinned ?? (height < SHORT_PLOT_HEIGHT ? SHORT_PLOT_TICKS : undefined);

type AxisLabel = { y: number; text: string };

/**
 * Label the zero baseline when the scale can put it between gridlines, and drop
 * the ticks the extra label would collide with. Returns the labels sorted top to
 * bottom. A scale that already labels 0 is returned untouched.
 */
export function labelZeroBaseline(labels: AxisLabel[], zeroLineY: number | undefined): AxisLabel[] {
  if (zeroLineY === undefined) return labels;
  if (labels.some((label) => Math.abs(label.y - zeroLineY) < ZERO_LABEL_COLLISION)) return labels;
  return [
    ...labels.filter((label) => Math.abs(label.y - zeroLineY) >= ZERO_LABEL_KEEP_AWAY),
    { y: zeroLineY, text: '0' },
  ].sort((a, b) => a.y - b.y);
}
