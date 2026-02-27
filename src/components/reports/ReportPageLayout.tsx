import React from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  children,
}) => {
  const years = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 5;
    const endYear = currentYear + 2;
    const result = [];
    for (let i = startYear; i <= endYear; i++) {
      result.push(i);
    }
    return result;
  }, []);

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
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            <Select value={currentDate.getFullYear().toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="年份" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y} 年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
          </div>

          <Button variant="outline" size="icon" onClick={onNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth() && (
            <Button variant="outline" onClick={onCurrentMonth}>
              本月
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
};
