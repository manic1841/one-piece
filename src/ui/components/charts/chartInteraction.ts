/** Shared pieces of chart interaction: pointer→index mapping, keyboard clamp, and tooltip anchoring. */
import * as React from 'react';

export type ChartPoint = {
  /** Period / point caption, e.g. "SEP 2026". */
  title: string;
  /** Highlighted value line, e.g. "$4,812,430". */
  value: string;
  /** Muted secondary line, e.g. "+8.42% YTD". */
  meta?: string;
};

/** Accessible description of a point: aria-valuetext for the interactive charts. */
export const describePoint = (point: ChartPoint): string =>
  [point.title, point.value, point.meta].filter((part) => part !== undefined).join(', ');

/** Keep an index inside `[0, count - 1]`. */
export const clampIndex = (index: number, count: number): number =>
  Math.min(count - 1, Math.max(0, index));

/** Flip the tooltip to the left of its anchor near the right edge. */
export const shouldFlipTooltip = (xRatio: number): boolean => xRatio > 0.72;

/** Gap between the tooltip card and the point it describes, in px. */
export const TOOLTIP_GAP = 12;

/**
 * Fallback card height for the first render (or when nothing is measurable):
 * a 3-line card (title + value + meta). Real cards can wrap, so the interactive
 * charts measure the actual card and anchor against that instead.
 */
export const TOOLTIP_CARD_ALLOWANCE = 84;

/**
 * Measures the rendered tooltip card and reports the top ratio above which the
 * card must be anchored so its top stays inside the plot. Re-measures whenever
 * `contentKey` changes (e.g. the hovered index), because wrapped text changes
 * the card height.
 */
export const useTooltipAllowance = (
  plotHeight: number,
  contentKey: string | number | null,
): { ref: React.Ref<HTMLDivElement>; allowedTopRatio: number } => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [cardHeight, setCardHeight] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const height = ref.current?.getBoundingClientRect().height ?? 0;
    setCardHeight(height > 0 ? height : null);
  }, [contentKey]);

  const allowance = (cardHeight ?? TOOLTIP_CARD_ALLOWANCE) + TOOLTIP_GAP;

  return { ref, allowedTopRatio: Math.min(0.9, allowance / plotHeight) };
};
