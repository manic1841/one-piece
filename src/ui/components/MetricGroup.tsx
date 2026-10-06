import * as React from 'react';

import { cn } from '@/ui/utils/cn';

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

const COLUMN_CLASS: Record<2 | 3 | 4 | 5, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
};

/** Peer-level financial metrics as a single row of typographic metrics, not cards. */
export function MetricGroup({
  children,
  columns = 4,
  lastSpansFull = false,
  className,
}: MetricGroupProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 divide-x divide-border',
        COLUMN_CLASS[columns],
        lastSpansFull && '[&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1',
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
  tone?: MoneyTone;
  /** Preformatted change line, e.g. "+6.8% YTD". */
  change?: string;
  changeTone?: MoneyChangeTone;
  /** Optional test id for the owning tile. */
  testId?: string;
  className?: string;
};

/** One metric inside MetricGroup: label over mono value over change line. */
export function Metric({
  label,
  value,
  tone = 'default',
  change,
  changeTone = 'muted',
  testId,
  className,
}: MetricProps) {
  return (
    <div data-testid={testId} className={cn('min-w-0 px-3 py-1 md:px-5 md:py-1.5', className)}>
      <span className={cn('block', eyebrowClass)}>{label}</span>
      <span className={cn('mt-1.5 block font-mono text-xl tabular-nums', MONEY_TONE_CLASS[tone])}>
        {value}
      </span>
      {change !== undefined && (
        <span
          className={cn('mt-1.5 block font-mono text-[11px]', MONEY_CHANGE_TONE_CLASS[changeTone])}
        >
          {change}
        </span>
      )}
    </div>
  );
}
