import { useCallback, useEffect, useState } from 'react';

import { format } from 'date-fns';

import { reportService } from '@/domains/report/reportService';
import {
  type BalanceSheetVM,
  mapBalanceSheetToVM,
} from '@/ui/features/report/viewmodels/reportDisplay.vm';
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

  const currentDate = controlledDate || internalDate;

  const load = useCallback(async () => {
    if (!householdId) return;
    const yearMonth =
      reportMode === 'YEARLY' ? format(currentDate, 'yyyy') : format(currentDate, 'yyyy-MM');

    await run(async () => {
      const result = await reportService.getStoredBalanceSheet(householdId, yearMonth);
      setData(result ? mapBalanceSheetToVM(result) : null);
    });
  }, [householdId, currentDate, run, reportMode]);

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
