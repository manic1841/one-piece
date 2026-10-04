import { useCallback, useState } from 'react';

import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { formatYearMonth } from '@/ui/utils';

import { formatYearMonthTitle } from '../mappers/monthlyClose.mappers';
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

  const year = selectedYearMonth.slice(0, 4);
  const month = selectedYearMonth.slice(5, 7);

  const setYear = useCallback(
    (nextYear: string) =>
      setSelectedYearMonth((previous) => `${nextYear}-${previous.slice(5, 7)}`),
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
    setYear,
    setMonth,
    isStarting,
    error,
    start,
  };
};
