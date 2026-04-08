import React from 'react';

import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';

interface YearMonthPickerProps {
  mode?: 'year-month' | 'year';
  year: string | number;
  month?: string | number;
  onYearChange: (year: string) => void;
  onMonthChange?: (month: string) => void;
  yearLabel?: string;
  monthLabel?: string;
  className?: string;
}

export const YearMonthPicker: React.FC<YearMonthPickerProps> = ({
  mode = 'year-month',
  year,
  month,
  onYearChange,
  onMonthChange,
  yearLabel = '年',
  monthLabel = '月',
  className,
}) => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const isYearOnly = mode === 'year';
  const resolvedClassName =
    className || (isYearOnly ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3');

  return (
    <div className={resolvedClassName}>
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
      {!isYearOnly && (
        <div className="space-y-2">
          <Label htmlFor="month-picker">{monthLabel}</Label>
          <Select
            value={(month ?? 1).toString()}
            onValueChange={(val) => {
              onMonthChange?.(val);
            }}
          >
            <SelectTrigger id="month-picker">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {months.map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {m} 月
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
