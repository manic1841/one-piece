import { useCallback, useState } from 'react';

import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { formatYearMonth } from '@/ui/utils';

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

  return { selectedYearMonth, setSelectedYearMonth, isStarting, error, start };
};
