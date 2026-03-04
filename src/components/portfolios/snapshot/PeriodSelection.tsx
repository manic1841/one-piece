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
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor="year">Year</Label>
        <Input
          id="year"
          type="number"
          required
          min="2000"
          max="2100"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="month">Month</Label>
        <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
          <SelectTrigger id="month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m.toString()}>
                {m} Month
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
