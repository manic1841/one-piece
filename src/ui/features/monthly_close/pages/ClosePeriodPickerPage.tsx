import React from 'react';

import { useNavigate } from 'react-router-dom';

import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { useAuthState } from '@/ui/contexts/useAuthState';

import { useMonthlyClosePickerPage } from '../hooks/useMonthlyClosePickerPage';

export const ClosePeriodPickerPage: React.FC = () => {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const userEmail = userProfile?.email ?? '';
  const navigate = useNavigate();
  const { selectedYearMonth, setSelectedYearMonth, isStarting, error, start } =
    useMonthlyClosePickerPage({ householdId, userEmail });

  const handleStart = async () => {
    const started = await start(selectedYearMonth);
    if (started) navigate(`/close/${selectedYearMonth}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-base">
      <div className="flex flex-col gap-4 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.PAGE_TITLE}
          </p>
          <h1 className="text-[30px] font-medium leading-tight text-foreground">
            {selectedYearMonth.slice(0, 4)} 年 {Number(selectedYearMonth.slice(5, 7))} 月
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <YearMonthPicker
            mode="year-month"
            year={selectedYearMonth.slice(0, 4)}
            month={selectedYearMonth.slice(5, 7)}
            onYearChange={(y) => setSelectedYearMonth(`${y}-${selectedYearMonth.slice(5, 7)}`)}
            onMonthChange={(m) =>
              setSelectedYearMonth(`${selectedYearMonth.slice(0, 4)}-${m.padStart(2, '0')}`)
            }
          />
          <Button
            onClick={() => void handleStart()}
            disabled={isStarting}
            className="active:scale-[0.97]"
          >
            {isStarting ? MONTHLY_CLOSE_LABELS.LOADING : MONTHLY_CLOSE_LABELS.START}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-negative/20 bg-negative/10 px-4 py-3 text-sm text-negative">
          {error}
        </div>
      )}

      <Card className="rounded-lg border-border/60">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">{MONTHLY_CLOSE_LABELS.SELECT_PERIOD}</p>
        </CardContent>
      </Card>
    </div>
  );
};
