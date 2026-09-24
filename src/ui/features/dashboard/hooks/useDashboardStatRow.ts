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

    await run(async () => getNextMonthDebtDueUseCase.execute({ householdId }), {
      writeBack: (result) => setNextMonthDue(result.ok ? result.value : null),
    });
  }, [householdId, run]);

  useEffect(() => {
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
