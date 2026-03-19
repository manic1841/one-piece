import { useCallback, useEffect, useState } from 'react';
import { reportService } from '@/domains/report/reportService';
import { type IncomeStatementData } from '@/domains/report/schemas';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { format } from 'date-fns';

export function useIncomeStatement(householdId: string, controlledDate?: Date) {
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [internalDate, setInternalDate] = useState<Date>(new Date());
  const { loading, error, run } = useLoadingTask();

  const currentDate = controlledDate || internalDate;

  const load = useCallback(async () => {
    if (!householdId) return;
    const yearMonth = format(currentDate, 'yyyy-MM');
    
    await run(async () => {
      const result = await reportService.generateIncomeStatement(householdId, yearMonth);
      setData(result);
    });
  }, [householdId, currentDate, run]);

  useEffect(() => {
    load();
  }, [load]);

  const nextMonth = () => {
    setInternalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setInternalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  return {
    data,
    loading,
    error,
    currentDate,
    setCurrentDate: setInternalDate,
    nextMonth,
    prevMonth,
    reload: load
  };
}
