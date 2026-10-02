import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import {
  MONEY_CHANGE_TONE_CLASS,
  MONEY_TONE_CLASS,
  type MoneyChangeTone,
  type MoneyTone,
} from './moneyTone';

type MetricGroupProps = {
  /** Peer-level metrics rendered in one row; collapses to 2 columns under md. */
  children: React.ReactNode;
  className?: string;
};

/** Peer-level financial metrics as a single row of typographic metrics, not cards. */
export function MetricGroup({ children, className }: MetricGroupProps) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 divide-x divide-border', className)}>
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
  className?: string;
};

/** One metric inside MetricGroup: label over mono value over change line. */
export function Metric({
  label,
  value,
  tone = 'default',
  change,
  changeTone = 'muted',
  className,
}: MetricProps) {
  return (
    <div className={cn('min-w-0 px-3 py-1 md:px-5 md:py-1.5', className)}>
      <span className="block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
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
