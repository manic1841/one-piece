import { cn } from '@/ui/utils/cn';

import { CHART_TONE_COLOR, type ChartTone } from './chartTheme';

export type ChartLegendItem = {
  label: string;
  /** Stable identity for the toggle; defaults to `label`. Set it when labels can repeat. */
  key?: string;
  /** Tone token for the swatch. Ignored when `color` is set. */
  tone?: ChartTone;
  /** Explicit swatch color (e.g. a donut slice color). */
  color?: string;
  /** Optional trailing value, e.g. a share percentage. */
  value?: string;
};

type ChartLegendProps = {
  items: ChartLegendItem[];
  /** `horizontal` = inline swatch row (bar charts); `vertical` = label/value rows (donuts). */
  orientation?: 'horizontal' | 'vertical';
  /** When supplied, each item becomes an `aria-pressed` toggle button. */
  onToggle?: (key: string) => void;
  /** Keys currently switched on; defaults to every item. Ignored without `onToggle`. */
  active?: readonly string[];
  className?: string;
};

/** Chart legend, optionally acting as a series toggle. */
export function ChartLegend({
  items,
  orientation = 'horizontal',
  onToggle,
  active,
  className,
}: ChartLegendProps) {
  const swatch = (item: ChartLegendItem) => (
    <span
      aria-hidden="true"
      className="h-2 w-2 flex-none"
      style={{ background: item.color ?? CHART_TONE_COLOR[item.tone ?? 'neutral'] }}
    />
  );

  const itemKey = (item: ChartLegendItem) => item.key ?? item.label;
  const isActive = (item: ChartLegendItem) =>
    active === undefined || active.includes(itemKey(item));
  const interactive = onToggle !== undefined;
  const toggleProps = (item: ChartLegendItem) =>
    interactive
      ? {
          type: 'button' as const,
          'aria-pressed': isActive(item),
          onClick: () => onToggle(itemKey(item)),
        }
      : {};

  if (orientation === 'vertical') {
    return (
      <div className={cn('grid gap-3', className)}>
        {items.map((item) =>
          interactive ? (
            <button
              key={itemKey(item)}
              {...toggleProps(item)}
              className={cn(
                'grid min-h-8 grid-cols-[10px_1fr_auto] items-center gap-2.5 text-left text-xs',
                !isActive(item) && 'opacity-50',
              )}
            >
              {swatch(item)}
              <span className="truncate text-muted-foreground">{item.label}</span>
              {item.value !== undefined && (
                <span className="font-mono tabular-nums text-foreground">{item.value}</span>
              )}
            </button>
          ) : (
            <div
              key={itemKey(item)}
              className="grid grid-cols-[10px_1fr_auto] items-center gap-2.5 text-xs"
            >
              {swatch(item)}
              <span className="truncate text-muted-foreground">{item.label}</span>
              {item.value !== undefined && (
                <span className="font-mono tabular-nums text-foreground">{item.value}</span>
              )}
            </div>
          ),
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-4', className)}>
      {items.map((item) => {
        const content = (
          <>
            {swatch(item)}
            {item.label}
            {item.value !== undefined && <span className="text-foreground">{item.value}</span>}
          </>
        );
        const sharedClass =
          'inline-flex min-h-8 items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground';
        return interactive ? (
          <button
            key={itemKey(item)}
            {...toggleProps(item)}
            className={cn(sharedClass, 'px-1', !isActive(item) && 'opacity-50')}
          >
            {content}
          </button>
        ) : (
          <span key={itemKey(item)} className={sharedClass}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
