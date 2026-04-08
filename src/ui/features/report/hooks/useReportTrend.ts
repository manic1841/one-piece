import { useCallback, useMemo } from 'react';

import { getTrendDataUseCase } from '@/application/report/use_cases/getTrendDataUseCase';
import { type TrendDataPoint } from '@/domains/report/types';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useReportTrend(householdId: string | undefined) {
  const { currentUser, isAdmin } = useAuth();
  const { loading, error, run } = useLoadingTask();

  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser?.uid, isAdmin],
  );

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
