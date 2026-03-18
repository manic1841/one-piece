import React from 'react';

import { YearMonthPicker } from '@/ui/components/YearMonthPicker';

interface PeriodSelectionProps {
  year: number;
  setYear: (y: number) => void;
  month: number;
  setMonth: (m: number) => void;
}

export const PeriodSelection: React.FC<PeriodSelectionProps> = ({
  year,
  setYear,
  month,
  setMonth,
}) => {
  return (
    <YearMonthPicker
      year={year}
      month={month}
      onYearChange={(y) => setYear(parseInt(y) || 0)}
      onMonthChange={(m) => setMonth(parseInt(m) || 1)}
    />
  );
};
