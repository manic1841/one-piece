import React from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReportPageLayoutProps {
  title: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  isCurrentMonth: () => boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  viewType?: 'month' | 'year';
  onViewTypeChange?: (viewType: 'month' | 'year') => void;
  children: React.ReactNode;
}

export const ReportPageLayout: React.FC<ReportPageLayoutProps> = ({
  title,
  currentDate,
  onDateChange,
  isCurrentMonth,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  viewType = 'month',
  onViewTypeChange,
  children,
}) => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleYearChange = (year: string) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(parseInt(year));
    onDateChange(newDate);
  };

  const handleMonthChange = (month: string) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(parseInt(month) - 1);
    onDateChange(newDate);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">{title}</h1>

          {/* View Type Toggle */}
          <div className="bg-muted inline-flex h-10 items-center justify-center rounded-md p-1">
            <button
              onClick={() => onViewTypeChange?.('month')}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                viewType === 'month' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              }`}
            >
              月
            </button>
            <button
              onClick={() => onViewTypeChange?.('year')}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                viewType === 'year' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              }`}
            >
              年
            </button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            <Input
              className="w-[100px]"
              type="number"
              min="2000"
              max="2100"
              value={currentDate.getFullYear()}
              onChange={(e) => handleYearChange(e.target.value)}
            />

            {viewType === 'month' && (
              <Select
                value={(currentDate.getMonth() + 1).toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-[85px]">
                  <SelectValue placeholder="月份" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m} 月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button variant="outline" size="icon" onClick={onNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth() && (
            <Button variant="outline" onClick={onCurrentMonth}>
              {viewType === 'month' ? '本月' : '今年'}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
};
