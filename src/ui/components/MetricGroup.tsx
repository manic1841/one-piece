import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { AnimatedNumber } from './AnimatedNumber';
import { eyebrowClass } from './eyebrow';
import {
  MONEY_CHANGE_TONE_CLASS,
  MONEY_TONE_CLASS,
  type MoneyChangeTone,
  type MoneyTone,
} from './moneyTone';

type MetricGroupProps = {
  /** Peer-level metrics rendered in one row; collapses to 2 columns under md. */
  children: React.ReactNode;
  /** Columns at md and up (mobile is always 2). */
  columns?: 2 | 3 | 4 | 5;
  /** Let the last metric span the full row on mobile (fills a ragged 2-col wrap). */
  lastSpansFull?: boolean;
  className?: string;
};

/**
 * Column ramp per count, plus the divider resets. `divide-x` puts a left border
 * on every cell but the first, so the first cell of each wrapped row has to
 * clear it; the reset follows the column count at the breakpoint it applies to.
 * Five metrics step down to three columns at md (mono figures collide long
 * before they shrink) and only reach five at lg.
 */
const mobileRowReset = 'max-md:[&>*:nth-child(2n+1)]:border-l-0';

/** The md reset for `n` columns: the first cell of every wrapped md row. */
const mdRowReset = (n: number) => `md:[&>*:nth-child(${n}n+1)]:border-l-0`;

const singleSpan = { lastSpan: 'md:[&>*:last-child]:col-span-1' };

const COLUMN_LAYOUT: Record<2 | 3 | 4 | 5, { grid: string; dividers: string; lastSpan: string }> = {
  2: { grid: 'md:grid-cols-2', dividers: `${mobileRowReset} ${mdRowReset(2)}`, ...singleSpan },
  3: { grid: 'md:grid-cols-3', dividers: `${mobileRowReset} ${mdRowReset(3)}`, ...singleSpan },
  4: { grid: 'md:grid-cols-4', dividers: `${mobileRowReset} ${mdRowReset(4)}`, ...singleSpan },
  5: {
    grid: 'md:grid-cols-3 lg:grid-cols-5',
    dividers: `${mobileRowReset} md:max-lg:[&>*:nth-child(3n+1)]:border-l-0 lg:[&>*:nth-child(5n+1)]:border-l-0`,
    // The ragged tablet row puts two metrics on it: the second-to-last takes the
    // double width and the last stays a normal cell, so the widest figure sits
    // on the reading side of the pair.
    lastSpan: 'md:max-lg:[&>*:nth-last-child(2)]:col-span-2 md:[&>*:last-child]:col-span-1',
  },
};

/** Peer-level financial metrics as a single row of typographic metrics, not cards. */
export function MetricGroup({
  children,
  columns = 4,
  lastSpansFull = false,
  className,
}: MetricGroupProps) {
  const layout = COLUMN_LAYOUT[columns];
  return (
    <div
      className={cn(
        'grid grid-cols-2 divide-x divide-border',
        layout.grid,
        layout.dividers,
        lastSpansFull && '[&>*:last-child]:col-span-2',
        lastSpansFull && layout.lastSpan,
        className,
      )}
    >
      {children}
    </div>
  );
}

type MetricProps = {
  label: string;
  /** Preformatted value, e.g. "$5,420,000" or "+$36,000". */
  value: string;
  /** Confirmed raw value; when given, the figure interpolates between updates (motion-system §5.2). */
  animatedValue?: number | null;
  /** Formatter for the animated figure. */
  animateFormat?: (value: number) => string;
  /** Count up from zero on mount; the dashboard stat row opts in (motion-system §5.2). */
  animateOnMount?: boolean;
  tone?: MoneyTone;
  /** Preformatted change line, e.g. "+6.8% YTD". */
  change?: string;
  changeTone?: MoneyChangeTone;
  /**
   * Muted note about the figure rather than a change to it, written
   * `標籤：值` (e.g. "錨定：2026-08"). Sits under the change line.
   */
  captionLabel?: string;
  /** Optional trailing control, e.g. a jump link. */
  action?: React.ReactNode;
  /** Optional test id for the owning tile. */
  testId?: string;
  /**
   * `stacked` is the phone list row — label left, figure right, change under the
   * figure — for surfaces that drop the grid below md.
   */
  layout?: 'column' | 'stacked';
  className?: string;
};

/** The label under a figure: one size for both layouts, muted for a caption. */
const captionClass = 'font-mono text-[11px] text-muted-foreground';
const changeClass = 'font-mono text-[11px]';

/** One metric inside MetricGroup: label over mono value over change line. */
export function Metric({
  label,
  value,
  animatedValue,
  animateFormat = (raw) => String(Math.round(raw)),
  animateOnMount = false,
  tone = 'default',
  change,
  changeTone = 'muted',
  captionLabel,
  action,
  testId,
  layout = 'column',
  className,
}: MetricProps) {
  const figure =
    animatedValue === undefined ? (
      value
    ) : (
      <AnimatedNumber
        value={animatedValue}
        format={animateFormat}
        missing={value}
        animateOnMount={animateOnMount}
      />
    );

  if (layout === 'stacked') {
    return (
      <div data-testid={testId} className={cn('flex flex-col py-2', className)}>
        <div className="flex items-baseline justify-between gap-3">
          <span className={cn('min-w-0', eyebrowClass)}>{label}</span>
          <span className={cn('shrink-0 font-mono text-lg tabular-nums', MONEY_TONE_CLASS[tone])}>
            {figure}
          </span>
        </div>
        {change !== undefined && (
          <span className={cn('mt-1 text-right', changeClass, MONEY_CHANGE_TONE_CLASS[changeTone])}>
            {change}
          </span>
        )}
        {captionLabel !== undefined && (
          <span className={cn('mt-1 text-right', captionClass)}>{captionLabel}</span>
        )}
        {action !== undefined && <span className="mt-2 self-end">{action}</span>}
      </div>
    );
  }

  return (
    <div data-testid={testId} className={cn('min-w-0 px-3 py-1 md:px-5 md:py-1.5', className)}>
      <span className={cn('block', eyebrowClass)}>{label}</span>
      <span className={cn('mt-1.5 block font-mono text-xl tabular-nums', MONEY_TONE_CLASS[tone])}>
        {figure}
      </span>
      {change !== undefined && (
        <span className={cn('mt-1.5 block', changeClass, MONEY_CHANGE_TONE_CLASS[changeTone])}>
          {change}
        </span>
      )}
      {captionLabel !== undefined && (
        <span className={cn('mt-1 block', captionClass)}>{captionLabel}</span>
      )}
      {action !== undefined && <span className="mt-2 block">{action}</span>}
    </div>
  );
}
