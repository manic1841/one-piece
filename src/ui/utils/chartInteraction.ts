/**
 * Pure chart-interaction vocabulary: tooltip content, point builders and the
 * scrubber's arithmetic. No React, so ViewModels may import it; the hooks live in
 * `@/ui/components/charts/chartInteraction`.
 */

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
