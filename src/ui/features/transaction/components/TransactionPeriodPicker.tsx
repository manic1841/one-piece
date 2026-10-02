import React, { useId, useState } from 'react';

import { ChevronDown } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/ui/popover';

export type TransactionPeriod = 'CURRENT_MONTH' | 'LAST_3_MONTHS' | 'CUSTOM';

interface TransactionPeriodPickerProps {
  period: TransactionPeriod;
  fromDate?: Date;
  toDate?: Date;
  onPeriodChange: (period: TransactionPeriod) => void;
  onRangeChange: (range: { fromDate?: Date; toDate?: Date }) => void | Promise<void>;
  className?: string;
}

const toInputValue = (date?: Date): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const PERIOD_OPTIONS: Array<{ value: TransactionPeriod; label: string }> = [
  { value: 'CURRENT_MONTH', label: '本月' },
  { value: 'LAST_3_MONTHS', label: '最近 3 個月' },
  { value: 'CUSTOM', label: '自訂日期' },
];

export const TransactionPeriodPicker: React.FC<TransactionPeriodPickerProps> = ({
  period,
  fromDate,
  toDate,
  onPeriodChange,
  onRangeChange,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [rangeError, setRangeError] = useState('');
  const fromInputId = useId();
  const toInputId = useId();
  const periodRadioName = useId();

  const handleApplyCustomRange = () => {
    if (draftFrom && draftTo && draftFrom > draftTo) {
      setRangeError('開始日期不可晚於結束日期');
      return;
    }

    setRangeError('');
    setOpen(false);
    void onRangeChange({
      fromDate: draftFrom ? new Date(`${draftFrom}T00:00:00`) : undefined,
      toDate: draftTo ? new Date(`${draftTo}T23:59:59.999`) : undefined,
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftFrom(toInputValue(fromDate));
      setDraftTo(toInputValue(toDate));
    }
    setRangeError('');
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
            {PERIOD_OPTIONS.find((option) => option.value === period)?.label}
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-3">
          <fieldset className="space-y-2">
            <legend className="mb-1 font-mono text-[10px] tracking-widest text-muted-foreground">
              期間
            </legend>
            {PERIOD_OPTIONS.map((option) => {
              const radioId = `${periodRadioName}-${option.value}`;
              return (
                <label
                  key={option.value}
                  htmlFor={radioId}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    id={radioId}
                    type="radio"
                    name={periodRadioName}
                    value={option.value}
                    checked={period === option.value}
                    onChange={() => {
                      onPeriodChange(option.value);
                      if (option.value !== 'CUSTOM') {
                        setOpen(false);
                      }
                    }}
                    className="size-4 accent-primary"
                  />
                  <span className="font-mono">{option.label}</span>
                </label>
              );
            })}
          </fieldset>

          {period === 'CUSTOM' ? (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <div>
                <label
                  htmlFor={fromInputId}
                  className="mb-1 block font-mono text-[10px] tracking-widest text-muted-foreground"
                >
                  FROM
                </label>
                <Input
                  id={fromInputId}
                  type="date"
                  value={draftFrom}
                  onChange={(event) => setDraftFrom(event.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <label
                  htmlFor={toInputId}
                  className="mb-1 block font-mono text-[10px] tracking-widest text-muted-foreground"
                >
                  TO
                </label>
                <Input
                  id={toInputId}
                  type="date"
                  value={draftTo}
                  onChange={(event) => setDraftTo(event.target.value)}
                  className="font-mono"
                />
              </div>
              {rangeError ? <p className="text-xs text-destructive">{rangeError}</p> : null}
              <Button
                type="button"
                variant="outline"
                className="w-full font-mono"
                onClick={handleApplyCustomRange}
              >
                套用
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
};
