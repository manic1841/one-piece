import { useCallback, useEffect, useState } from 'react';

import {
  getNextMonthDebtDueUseCase,
  type NextMonthDebtDueResult,
} from '@/application/debt/use_cases/getNextMonthDebtDueUseCase';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

const LOAD_ERROR = '無法載入下月應付';

export function useDashboardStatRow(householdId: string | undefined) {
  const [nextMonthDue, setNextMonthDue] = useState<NextMonthDebtDueResult | null>(null);
  const { loading, error, run } = useLoadingTask();
  const errorMessage = error === null ? null : LOAD_ERROR;

  const loadData = useCallback(async () => {
    if (!householdId) return;

    const result = await run(async () => {
      return getNextMonthDebtDueUseCase.execute({ householdId });
    });
    setNextMonthDue(result.ok ? result.value : null);
  }, [householdId, run]);

  useEffect(() => {
    // The analyzer cannot see through the awaited write-back in `loadData` and
    // reports this as a synchronous setState; the write-back lands in a promise
    // continuation, not in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  return {
    nextMonthDue,
    loading,
    error,
    errorMessage,
    reload: loadData,
  };
}
