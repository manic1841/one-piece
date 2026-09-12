import { useCallback } from 'react';

import { getTrendDataUseCase } from '@/application/report/use_cases/getTrendDataUseCase';
import { type TrendDataPoint } from '@/domains/report/types';
import { useAuthContext } from '@/ui/hooks/useAuthContext';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useReportTrend(householdId: string | undefined) {
  const auth = useAuthContext();
  const { loading, error, run } = useLoadingTask();

  const getTrendData = useCallback(async (): Promise<TrendDataPoint[]> => {
    if (!householdId) return [];
    const result = await run(async () => {
      return getTrendDataUseCase.execute({ householdId, auth });
    });
    return result || [];
  }, [householdId, auth, run]);

  return {
    getTrendData,
    loading,
    error,
  };
}
