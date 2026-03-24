import { useCallback, useEffect, useState } from 'react';

import { format } from 'date-fns';

import { reportService } from '@/domains/report/reportService';
import { type IncomeStatementData } from '@/domains/report/schemas';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

type ReportMode = 'MONTHLY' | 'YEARLY';

export function useIncomeStatement(
  householdId: string,
  controlledDate?: Date,
  reportMode: ReportMode = 'MONTHLY',
) {
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [internalDate, setInternalDate] = useState<Date>(new Date());
  const { loading, error, run } = useLoadingTask();

  const currentDate = controlledDate || internalDate;

  const load = useCallback(async () => {
    if (!householdId) return;
    const yearMonth =
      reportMode === 'YEARLY' ? format(currentDate, 'yyyy') : format(currentDate, 'yyyy-MM');

    await run(async () => {
      const result = await reportService.getStoredIncomeStatement(householdId, yearMonth);
      setData(result);
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
