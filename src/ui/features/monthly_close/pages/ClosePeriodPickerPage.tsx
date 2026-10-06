import React from 'react';

import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { PageHeader } from '@/ui/components/PageHeader';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { useAuthState } from '@/ui/contexts/useAuthState';

import { useMonthlyClosePickerPage } from '../hooks/useMonthlyClosePickerPage';

export const ClosePeriodPickerPage: React.FC = () => {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const userEmail = userProfile?.email ?? '';
  const navigate = useNavigate();
  const { selectedYearMonth, year, month, title, setYear, setMonth, isStarting, error, start } =
    useMonthlyClosePickerPage({ householdId, userEmail });

  const handleStart = async () => {
    const started = await start(selectedYearMonth);
    if (started) navigate(`/close/${selectedYearMonth}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-base">
      <PageHeader
        crumb={MONTHLY_CLOSE_LABELS.PAGE_TITLE}
        title={title}
        actions={
          <>
            <YearMonthPicker
              mode="year-month"
              year={year}
              month={month}
              onYearChange={(nextYear) => setYear(nextYear)}
              onMonthChange={(nextMonth) => setMonth(nextMonth)}
            />
            <Button
              onClick={() => void handleStart()}
              disabled={isStarting}
              className="active:scale-[0.97]"
            >
              {isStarting ? MONTHLY_CLOSE_LABELS.LOADING : MONTHLY_CLOSE_LABELS.START}
            </Button>
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <EmptyState
        title={MONTHLY_CLOSE_LABELS.SELECT_PERIOD}
        description={MONTHLY_CLOSE_LABELS.SELECT_PERIOD_HINT}
      />
    </div>
  );
};
