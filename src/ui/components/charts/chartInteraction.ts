/** Shared pieces of chart interaction: point vocabulary, keyboard scrubber, and tooltip anchoring. */
import * as React from 'react';

/** One datum in a tooltip. */
export type TooltipItem = {
  /** React key and, for list content, the row's identity. */
  id: string;
  /** Row caption; omit for a bare auxiliary value. */
  label?: string;
  value: string;
  /** Muted qualification, e.g. a share or a change against the previous period. */
  detail?: string;
  /** CSS colour for an optional swatch. */
  color?: string;
};

/**
 * Tooltip content is semantic, not positional: `hero` names its primary datum
 * explicitly, `list` puts every datum on the same level.
 */
export type TooltipContent =
  | { mode: 'hero'; primary?: TooltipItem; secondary?: TooltipItem[] }
  | { mode: 'list'; items: TooltipItem[] };

export type ChartPoint = {
  /** Period / point caption, e.g. "SEP 2026". */
  title: string;
  content: TooltipContent;
};

const present = <T>(items: (T | null | undefined)[]): T[] =>
  items.filter((item): item is T => item !== null && item !== undefined);

/** A point with one primary datum and auxiliary values beneath it. */
export const heroPoint = (
  title: string,
  primary: TooltipItem | undefined,
  secondary: (TooltipItem | null | undefined)[] = [],
): ChartPoint => ({
  title,
  content: { mode: 'hero', primary, secondary: present(secondary) },
});

/** A point whose data all share one level. */
export const listPoint = (
  title: string,
  items: (TooltipItem | null | undefined)[],
): ChartPoint => ({ title, content: { mode: 'list', items: present(items) } });

const describeItem = (item: TooltipItem): string =>
  [item.label, item.value, item.detail].filter((part) => part !== undefined).join(' ');

/** Accessible description of a point: aria-valuetext for the interactive charts. */
export const describePoint = (point: ChartPoint): string => {
  const { content } = point;
  if (content.mode === 'list') {
    return [point.title, ...content.items.map(describeItem)].join(', ');
  }
  const primary = content.primary === undefined ? [] : [describeItem(content.primary)];
  return [point.title, ...primary, ...(content.secondary ?? []).map(describeItem)].join(', ');
};

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
export const useChartScrubber = (
  count: number,
  plotHeight: number,
  onActivate?: (index: number) => void,
  selectedIndex?: number,
) => {
  const [active, setActive] = React.useState<number | null>(null);
  const { ref: tooltipRef, allowedTopRatio } = useTooltipAllowance(plotHeight, active);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      setActive(clampIndex((active ?? selectedIndex ?? -1) + step, count));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const index = active ?? selectedIndex;
      if (onActivate === undefined || index === undefined) return;
      event.preventDefault();
      onActivate(index);
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
