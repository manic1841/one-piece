import { useCallback, useEffect, useState } from 'react';

import { format } from 'date-fns';

import { getStoredReportUseCase } from '@/application/report/use_cases/getStoredReportUseCase';
import { type BalanceSheetData } from '@/domains/report/schemas';
import {
  type BalanceSheetVM,
  mapBalanceSheetToVM,
} from '@/ui/features/report/viewmodels/reportDisplay.vm';
import { getErrorMessage } from '@/ui/hooks/getErrorMessage';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

type ReportMode = 'MONTHLY' | 'YEARLY';

export function useBalanceSheet(
  householdId: string,
  controlledDate?: Date,
  reportMode: ReportMode = 'MONTHLY',
) {
  const [data, setData] = useState<BalanceSheetVM | null>(null);
  const [internalDate, setInternalDate] = useState<Date>(new Date());
  const { loading, error, run } = useLoadingTask();
  const auth = useAuthIdentity();

  const currentDate = controlledDate || internalDate;

  const load = useCallback(async () => {
    if (!householdId) return;
    const yearMonth =
      reportMode === 'YEARLY' ? format(currentDate, 'yyyy') : format(currentDate, 'yyyy-MM');

    await run(async () => {
      const result = await getStoredReportUseCase.execute({
        householdId,
        yearMonth,
        kind: 'balanceSheet',
        auth,
      });
      setData(result ? mapBalanceSheetToVM(result as BalanceSheetData) : null);
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
    errorMessage: error !== null ? getErrorMessage(error) : null,
    currentDate,
    setCurrentDate: setInternalDate,
    nextMonth,
    prevMonth,
    reload: load,
  };
}
