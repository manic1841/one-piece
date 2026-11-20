import React from 'react';

import { eyebrowClass } from '@/ui/components/eyebrow';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { cn } from '@/ui/utils/cn';

import { type CloseMonthVM } from '../viewmodels/closeMonthMatrix.vm';

interface ClosePeriodMatrixProps {
  months: CloseMonthVM[];
  selectedYearMonth: string;
  onSelect: (yearMonth: string) => void;
}

const statusClass: Record<CloseMonthVM['status'], string> = {
  CLOSED: 'text-positive',
  IN_PROGRESS: 'text-foreground',
  NEEDS_REVIEW: 'text-warning',
  NOT_STARTED: 'text-muted-foreground',
};

/**
 * The last six months as a pickable matrix. The year-month picker can reach any
 * month, but close work is scoped to the recent ones, so the common case is one
 * tap instead of two stepper controls.
 */
export const ClosePeriodMatrix: React.FC<ClosePeriodMatrixProps> = ({
  months,
  selectedYearMonth,
  onSelect,
}) => (
  <section aria-label={MONTHLY_CLOSE_LABELS.RECENT_PERIODS_LABEL} className="space-y-2">
    <p className={eyebrowClass}>{MONTHLY_CLOSE_LABELS.RECENT_PERIODS_LABEL}</p>
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {months.map((month) => {
        const isSelected = month.yearMonth === selectedYearMonth;
        return (
          <button
            key={month.yearMonth}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(month.yearMonth)}
            className={cn(
              'flex min-h-11 flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              isSelected
                ? 'border-border-strong bg-elevated'
                : 'border-border hover:border-border-strong hover:bg-muted/40',
            )}
          >
            <span className="font-mono text-sm tabular-nums text-foreground">
              {month.monthText}
            </span>
            <span className={cn('text-[11px]', statusClass[month.status])}>{month.statusText}</span>
          </button>
        );
      })}
    </div>
  </section>
);
