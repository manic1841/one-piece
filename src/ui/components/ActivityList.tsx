import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { MONEY_TONE_CLASS, type MoneyTone } from './moneyTone';

type ActivityRowProps = {
  /** Short date or marker, e.g. "SEP 18". */
  date: string;
  title: string;
  /** Secondary line under the title, e.g. account name. */
  meta?: string;
  /** Preformatted amount, e.g. "+$85,000". */
  amount?: string;
  tone?: MoneyTone;
  /** When given, the row becomes an interactive button that calls this on click. */
  onActivate?: () => void;
  className?: string;
};

/** One recent-activity line: date / title+meta / amount. List rows are provided by the caller. */
export function ActivityRow({
  date,
  title,
  meta,
  amount,
  tone = 'default',
  onActivate,
  className,
}: ActivityRowProps) {
  const body = (
    <>
      <span className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground">{date}</span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm">{title}</span>
        {meta !== undefined && (
          <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
            {meta}
          </span>
        )}
      </div>
      {amount !== undefined && (
        <span className={cn('shrink-0 font-mono text-sm tabular-nums', MONEY_TONE_CLASS[tone])}>
          {amount}
        </span>
      )}
    </>
  );

  const baseClass = 'flex min-h-12 items-center gap-4 border-b border-border py-2';

  if (onActivate !== undefined) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className={cn(
          baseClass,
          'w-full cursor-pointer text-left transition-colors hover:bg-muted/50',
          className,
        )}
      >
        {body}
      </button>
    );
  }

  return <div className={cn(baseClass, className)}>{body}</div>;
}

type ActivityListProps = {
  /** The ActivityRow list; separators and empty states belong to the caller. */
  children: React.ReactNode;
  className?: string;
};

/** Recent context as a typographic list, not a data table. */
export function ActivityList({ children, className }: ActivityListProps) {
  return <div className={cn('[&>*:last-child]:border-b-0', className)}>{children}</div>;
}
