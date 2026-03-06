import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface YearMonthPickerProps {
  year: string | number;
  month: string | number;
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
  yearLabel?: string;
  monthLabel?: string;
  className?: string;
}

export const YearMonthPicker: React.FC<YearMonthPickerProps> = ({
  year,
  month,
  onYearChange,
  onMonthChange,
  yearLabel = '年',
  monthLabel = '月份',
  className = 'grid grid-cols-2 gap-3',
}) => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className={className}>
      <div className="space-y-2">
        <Label htmlFor="year-picker">{yearLabel}</Label>
        <Input
          id="year-picker"
          type="number"
          required
          min="2000"
          max="2100"
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="month-picker">{monthLabel}</Label>
        <Select value={month.toString()} onValueChange={(val) => onMonthChange(val)}>
          <SelectTrigger id="month-picker">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m.toString()}>
                {m} {monthLabel === '月份' ? '月' : 'Month'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
