import { useCallback } from 'react';

import { getReportUseCase } from '@/application/report/use_cases/getReportUseCase';
import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { type ReportType } from '@/domains/report/schemas';
import { type FinancialReport } from '@/domains/report/types';
import { useAuthContext } from '@/ui/hooks/useAuthContext';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

const normalizeReportType = (type: string): ReportType => {
  if (type === 'income_statement') return 'INCOME_STATEMENT';
  if (type === 'balance_sheet') return 'BALANCE_SHEET';
  return type as ReportType;
};

export function useReports(householdId: string | undefined) {
  const auth = useAuthContext();
  const { loading, error, run } = useLoadingTask();

  const getReport = useCallback(
    async (type: string, year: number, month: number): Promise<FinancialReport | null> => {
      if (!householdId) return null;
      const result = await run(async () => {
        return getReportUseCase.execute({
          householdId,
          type: normalizeReportType(type),
          year,
          month,
          auth,
        });
      });
      return (result as FinancialReport) || null;
    },
    [householdId, auth, run],
  );

  const listReports = useCallback(async (): Promise<FinancialReport[]> => {
    if (!householdId) return [];
    const result = await run(async () => {
      return listReportsUseCase.execute({ householdId, auth });
    });
    return result || [];
  }, [householdId, auth, run]);

  return {
    getReport,
    listReports,
    loading,
    error,
  };
}
