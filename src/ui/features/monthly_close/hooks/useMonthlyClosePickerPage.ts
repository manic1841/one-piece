import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ListFinancialPeriodsUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { type FinancialPeriod } from '@/domains/financial_period/schemas';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { formatYearMonth } from '@/ui/utils';

import { formatYearMonthTitle } from '../mappers/monthlyClose.mappers';
import { buildCloseMonthMatrix } from '../viewmodels/closeMonthMatrix.vm';
import { monthlyCloseErrorText } from './monthlyCloseErrorText';

interface UseMonthlyClosePickerPageArgs {
  householdId: string;
  userEmail: string;
}

/** The picker's controller: pick a `YYYY-MM` and ensure its period record exists (`start`). */
export const useMonthlyClosePickerPage = ({
  householdId,
  userEmail,
}: UseMonthlyClosePickerPageArgs) => {
  const auth = useAuthIdentity();
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() =>
    formatYearMonth(new Date().getFullYear(), new Date().getMonth() + 1),
  );
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [periodsError, setPeriodsError] = useState(false);
  // Only the first read may move the selection: a later refresh must not steal
  // a month the user already picked.
  const autoSelected = useRef(false);
  // Fixed at mount: the six-month window is what the page was opened on, so it
  // cannot shift under the user while a read settles.
  const [anchor] = useState<string>(() =>
    formatYearMonth(new Date().getFullYear(), new Date().getMonth() + 1),
  );

  // The matrix only needs to know which months already have a record. A failed
  // read is reported as a caption (the months stay pickable) instead of silently
  // claiming every month is unstarted.
  //
  // The first read also moves the default off "today": close work happens on
  // months that exist, so the newest one with a record is the useful landing
  // spot. Months are `YYYY-MM`, so the newest is the string maximum.
  useEffect(() => {
    if (!householdId) return;
    let active = true;
    void new ListFinancialPeriodsUseCase()
      .execute({ householdId })
      .then((result) => {
        if (!active) return;
        setPeriods(result);
        setPeriodsError(false);
        if (!autoSelected.current) {
          autoSelected.current = true;
          const newest = result.reduce<string | null>(
            (latest, period) => (latest === null || period.yearMonth > latest ? period.yearMonth : latest),
            null,
          );
          if (newest !== null) setSelectedYearMonth(newest);
        }
      })
      .catch(() => {
        if (active) setPeriodsError(true);
      });
    return () => {
      active = false;
    };
  }, [householdId]);

  const year = selectedYearMonth.slice(0, 4);
  const month = selectedYearMonth.slice(5, 7);

  const months = useMemo(() => buildCloseMonthMatrix(anchor, periods), [anchor, periods]);

  const setYear = useCallback(
    (nextYear: string) => setSelectedYearMonth((previous) => `${nextYear}-${previous.slice(5, 7)}`),
    [],
  );

  const setMonth = useCallback(
    (nextMonth: string) =>
      setSelectedYearMonth((previous) => `${previous.slice(0, 4)}-${nextMonth.padStart(2, '0')}`),
    [],
  );

  const start = useCallback(
    async (yearMonth: string): Promise<boolean> => {
      if (!householdId) return false;
      setIsStarting(true);
      setError(null);
      try {
        await monthlyCloseWorkflowUseCase.start({ householdId, yearMonth, userEmail, auth });
        return true;
      } catch (err) {
        setError(monthlyCloseErrorText(err, MONTHLY_CLOSE_LABELS.START_ERROR));
        return false;
      } finally {
        setIsStarting(false);
      }
    },
    [auth, householdId, userEmail],
  );

  return {
    selectedYearMonth,
    year,
    month,
    title: formatYearMonthTitle(selectedYearMonth),
    months,
    setYear,
    setMonth,
    setSelectedYearMonth,
    isStarting,
    error,
    periodsError,
    start,
  };
};
