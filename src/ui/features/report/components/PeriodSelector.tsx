import React, { useState } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';

// import { getMonthRange, getQuarterRange, getYearRange } from '../../utils/dateUtils';

export type PeriodType = 'monthly' | 'quarterly' | 'yearly';

interface PeriodSelectorProps {
  onChange: (startDate: Date, endDate: Date, periodType: PeriodType) => void;
}

const getMonthRange = (year: number, month: number) => ({
  start: new Date(year, month - 1, 1),
  end: new Date(year, month, 0),
});

const getQuarterRange = (year: number, quarter: number) => {
  const startMonth = (quarter - 1) * 3;
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 0),
  };
};

const getYearRange = (year: number) => ({
  start: new Date(year, 0, 1),
  end: new Date(year, 11, 31),
});

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ onChange }) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [quarter, setQuarter] = useState(Math.floor((currentMonth - 1) / 3) + 1);

  // Update parent when period changes
  React.useEffect(() => {
    let range: { start: Date; end: Date };

    if (periodType === 'monthly') {
      range = getMonthRange(year, month);
    } else if (periodType === 'quarterly') {
      range = getQuarterRange(year, quarter);
    } else {
      range = getYearRange(year);
    }

    onChange(range.start, range.end, periodType);
  }, [periodType, year, month, quarter, onChange]);

  const handlePrevious = () => {
    if (periodType === 'monthly') {
      if (month === 1) {
        setMonth(12);
        setYear(year - 1);
      } else {
        setMonth(month - 1);
      }
    } else if (periodType === 'quarterly') {
      if (quarter === 1) {
        setQuarter(4);
        setYear(year - 1);
      } else {
        setQuarter(quarter - 1);
      }
    } else {
      setYear(year - 1);
    }
  };

  const handleNext = () => {
    if (periodType === 'monthly') {
      if (month === 12) {
        setMonth(1);
        setYear(year + 1);
      } else {
        setMonth(month + 1);
      }
    } else if (periodType === 'quarterly') {
      if (quarter === 4) {
        setQuarter(1);
        setYear(year + 1);
      } else {
        setQuarter(quarter + 1);
      }
    } else {
      setYear(year + 1);
    }
  };

  const getPeriodLabel = () => {
    if (periodType === 'monthly') {
      return `${year}年${month}月`;
    } else if (periodType === 'quarterly') {
      return `${year}年 Q${quarter}`;
    } else {
      return `${year}年`;
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Period Type Selector */}
      <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">月度</SelectItem>
          <SelectItem value="quarterly">季度</SelectItem>
          <SelectItem value="yearly">年度</SelectItem>
        </SelectContent>
      </Select>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="min-w-[120px] text-center font-medium">{getPeriodLabel()}</div>

        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PeriodSelector;
