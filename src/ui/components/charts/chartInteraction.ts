/** Shared pieces of chart interaction: point vocabulary, keyboard scrubber, and tooltip anchoring. */
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

/** Assumed card height (3 lines) until the real card has been measured. */
export const TOOLTIP_CARD_ALLOWANCE = 84;

/**
 * Measures the rendered tooltip card so the charts can anchor it inside the plot.
 * Re-runs on `contentKey` because wrapped text changes the card height.
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

/**
 * Scrubber state shared by the interactive charts: arrow keys move the active
 * index, Escape clears it. `ariaValueProps` keeps the aria value contract in one
 * place; `role`/`tabIndex` stay literal on each element so the a11y linter sees
 * them (jsx-a11y cannot read a spread).
 */
export const useChartScrubber = (count: number, plotHeight: number) => {
  const [active, setActive] = React.useState<number | null>(null);
  const { ref: tooltipRef, allowedTopRatio } = useTooltipAllowance(plotHeight, active);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      setActive(clampIndex((active ?? -1) + step, count));
      return;
    }
    if (event.key === 'Escape') setActive(null);
  };

  const clear = () => setActive(null);

  const ariaValueProps = {
    'aria-valuemin': 0,
    'aria-valuemax': count - 1,
    'aria-valuenow': active ?? 0,
  } as const;

  return { active, setActive, clear, handleKeyDown, tooltipRef, allowedTopRatio, ariaValueProps };
};
