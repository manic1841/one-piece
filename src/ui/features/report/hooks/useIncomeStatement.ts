import { useCallback, useEffect, useState } from 'react';

import { format } from 'date-fns';

import { getStoredReportUseCase } from '@/application/report/use_cases/getStoredReportUseCase';
import { type IncomeStatementData } from '@/domains/report/schemas';
import {
  type IncomeStatementVM,
  mapIncomeStatementToVM,
} from '@/ui/features/report/viewmodels/reportDisplay.vm';
import { useAuthContext } from '@/ui/hooks/useAuthContext';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

type ReportMode = 'MONTHLY' | 'YEARLY';

export function useIncomeStatement(
  householdId: string,
  controlledDate?: Date,
  reportMode: ReportMode = 'MONTHLY',
) {
  const [data, setData] = useState<IncomeStatementVM | null>(null);
  const [internalDate, setInternalDate] = useState<Date>(new Date());
  const { loading, error, run } = useLoadingTask();
  const auth = useAuthContext();

  const currentDate = controlledDate || internalDate;

  const load = useCallback(async () => {
    if (!householdId) return;
    const yearMonth =
      reportMode === 'YEARLY' ? format(currentDate, 'yyyy') : format(currentDate, 'yyyy-MM');

    await run(async () => {
      const result = await getStoredReportUseCase.execute({
        householdId,
        yearMonth,
        kind: 'incomeStatement',
        auth,
      });
      setData(result ? mapIncomeStatementToVM(result as IncomeStatementData) : null);
    });
  }, [householdId, currentDate, run, reportMode, auth]);

  useEffect(() => {
    load();
  }, [load]);

  const nextMonth = () => {
    setInternalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setInternalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  return {
    data,
    loading,
    error,
    currentDate,
    setCurrentDate: setInternalDate,
    nextMonth,
    prevMonth,
    reload: load,
  };
}
