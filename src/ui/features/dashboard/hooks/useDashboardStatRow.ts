import { useCallback, useEffect, useState } from 'react';

import {
  getNextMonthDebtDueUseCase,
  type NextMonthDebtDueResult,
} from '@/application/debt/use_cases/getNextMonthDebtDueUseCase';

export function useDashboardStatRow(householdId: string | undefined) {
  const [nextMonthDue, setNextMonthDue] = useState<NextMonthDebtDueResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const result = await getNextMonthDebtDueUseCase.execute({ householdId });
      setNextMonthDue(result);
      setError(null);
    } catch (err) {
      console.error('Failed to load next month debt due:', err);
      setNextMonthDue(null);
      setError('無法載入下月應付');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadData]);

  return {
    nextMonthDue,
    loading,
    error,
    reload: loadData,
  };
}
