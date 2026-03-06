import React from 'react';

import { YearMonthPicker } from '@/components/shared/YearMonthPicker';

interface SettlementSelectionProps {
  year: number;
  month: number;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  error?: string;
}

export const SettlementSelection: React.FC<SettlementSelectionProps> = ({
  year,
  month,
  setYear,
  setMonth,
  error,
}) => {
  return (
    <div className="space-y-4 py-4">
      <p className="text-muted-foreground">
        Select the month you want to settle. This will create snapshots for all active projects.
      </p>

      {/* Year & Month */}
      <YearMonthPicker
        year={year}
        month={month}
        onYearChange={(y) => setYear(parseInt(y) || 0)}
        onMonthChange={(m) => setMonth(parseInt(m) || 1)}
        yearLabel="年份"
        monthLabel="月份"
      />

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
      )}
    </div>
  );
};
