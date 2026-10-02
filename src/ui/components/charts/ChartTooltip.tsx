import * as React from 'react';

import { cn } from '@/ui/utils/cn';

type ChartTooltipProps = {
  /** Period / point caption, e.g. "SEP 2026". */
  title: string;
  /** Highlighted value line, e.g. "$4,812,430". */
  value: string;
  /** Muted secondary line, e.g. "+8.42% YTD". */
  meta?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Caller ref, used by the interactive charts to measure the card before anchoring it. */
  ref?: React.Ref<HTMLDivElement>;
};

/**
 * Chart hover card surface. Positioning is the caller's job (see
 * `InteractiveLineChart`); this renders the floating card only.
 */
export function ChartTooltip({ title, value, meta, className, style, ref }: ChartTooltipProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'min-w-[132px] rounded border border-border-strong bg-card px-2.5 py-2 font-mono text-[11px] shadow-lg',
        className,
      )}
      style={style}
    >
      <p className="text-foreground">{title}</p>
      <p className="text-primary">{value}</p>
      {meta !== undefined && <p className="mt-0.5 text-muted-foreground">{meta}</p>}
    </div>
  );
}
