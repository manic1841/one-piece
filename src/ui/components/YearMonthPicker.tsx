import React, { useCallback, useState } from 'react';

import { ChevronDown } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/ui/popover';
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
  className?: string;
}

const MONTH_LABELS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

export const YearMonthPicker: React.FC<YearMonthPickerProps> = ({
  mode = 'year-month',
  year,
  month,
  onYearChange,
  onMonthChange,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [draftYear, setDraftYear] = useState<number | null>(null);
  const [draftMonth, setDraftMonth] = useState<number | null>(null);
  const isYearOnly = mode === 'year';
  const resolvedYear = typeof year === 'number' ? year : parseInt(year) || 2000;
  const resolvedMonth = isYearOnly
    ? 1
    : Math.min(Math.max(typeof month === 'number' ? month : parseInt(month ?? '1') || 1, 1), 12);
  const years = Array.from({ length: 101 }, (_, i) => 2000 + i);

  const effectiveYear = draftYear ?? resolvedYear;
  const effectiveMonth = draftMonth ?? resolvedMonth;

  const handleApply = useCallback(() => {
    if (effectiveYear !== resolvedYear) {
      onYearChange(effectiveYear.toString());
    }
    if (!isYearOnly && effectiveMonth !== resolvedMonth) {
      onMonthChange?.(effectiveMonth.toString());
    }
    setDraftYear(null);
    setDraftMonth(null);
    setOpen(false);
  }, [
    effectiveMonth,
    effectiveYear,
    isYearOnly,
    onMonthChange,
    onYearChange,
    resolvedMonth,
    resolvedYear,
  ]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDraftYear(null);
      setDraftMonth(null);
    }
    setOpen(nextOpen);
  };

  return (
    <div className={className || 'inline-flex'}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-haspopup="listbox"
            aria-expanded={open}
            className="font-mono tabular-nums"
          >
            {isYearOnly
              ? `${resolvedYear} `
              : `${MONTH_LABELS[resolvedMonth - 1]} ${resolvedYear} `}
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                YEAR
              </span>
              <Select
                value={effectiveYear.toString()}
                onValueChange={(val) => setDraftYear(parseInt(val) || 2000)}
              >
                <SelectTrigger aria-label="year-picker-year" className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()} className="font-mono">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isYearOnly && (
              <div className="space-y-1">
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                  MONTH
                </span>
                <Select
                  value={effectiveMonth.toString()}
                  onValueChange={(val) => setDraftMonth(parseInt(val) || 1)}
                >
                  <SelectTrigger aria-label="year-picker-month" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {MONTH_LABELS.map((label, index) => (
                      <SelectItem key={label} value={(index + 1).toString()} className="font-mono">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full font-mono"
            onClick={handleApply}
          >
            APPLY
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
};
