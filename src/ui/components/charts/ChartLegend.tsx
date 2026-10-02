import { cn } from '@/ui/utils/cn';

import { CHART_TONE_COLOR, type ChartTone } from './chartTheme';

export type ChartLegendItem = {
  label: string;
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
  className?: string;
};

/** Chart legend. Labels come from the caller — never hardcode domain series names here. */
export function ChartLegend({ items, orientation = 'horizontal', className }: ChartLegendProps) {
  const swatch = (item: ChartLegendItem) => (
    <span
      aria-hidden="true"
      className="h-2 w-2 flex-none"
      style={{ background: item.color ?? CHART_TONE_COLOR[item.tone ?? 'neutral'] }}
    />
  );

  if (orientation === 'vertical') {
    return (
      <div className={cn('grid gap-3', className)}>
        {items.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[10px_1fr_auto] items-center gap-2.5 text-xs"
          >
            {swatch(item)}
            <span className="truncate text-muted-foreground">{item.label}</span>
            {item.value !== undefined && (
              <span className="font-mono tabular-nums text-foreground">{item.value}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-4', className)}>
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-heading text-muted-foreground"
        >
          {swatch(item)}
          {item.label}
          {item.value !== undefined && <span className="text-foreground">{item.value}</span>}
        </span>
      ))}
    </div>
  );
}
