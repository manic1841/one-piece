import { useCallback, useMemo } from 'react';

import { generateReportsUseCase } from '@/application/report/use_cases/generateReportsUseCase';
import { saveReportsUseCase } from '@/application/report/use_cases/saveReportsUseCase';
import { type FinancialReport } from '@/domains/report/types';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useReportCmds(householdId: string | undefined, userEmail: string | undefined) {
  const { currentUser, isAdmin } = useAuth();
  const { loading, error, run } = useLoadingTask();

  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser?.uid, isAdmin],
  );

  const generateReports = useCallback(
    async (
      year: number,
      month: number,
    ): Promise<{
      incomeStatement: FinancialReport;
      balanceSheet: FinancialReport;
    } | null> => {
      if (!householdId) return null;
      const result = await run(async () => {
        return generateReportsUseCase.execute({
          householdId,
          year,
          month,
          auth,
        });
      });
      return result || null;
    },
    [householdId, auth, run],
  );

  const saveReports = useCallback(
    async (reports: FinancialReport[]): Promise<void> => {
      if (!householdId || !userEmail) return;
      await run(async () => {
        return saveReportsUseCase.execute({
          householdId,
          reports,
          userEmail,
          auth,
        });
      });
    },
    [householdId, userEmail, auth, run],
  );

  return {
    generateReports,
    saveReports,
    loading,
    error,
  };
}
