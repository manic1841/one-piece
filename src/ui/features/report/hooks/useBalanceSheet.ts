import { useCallback, useEffect, useState } from 'react';
import { reportService } from '@/domains/report/reportService';
import { type BalanceSheetData } from '@/domains/report/schemas';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { format } from 'date-fns';

export function useBalanceSheet(householdId: string, initialDate: Date = new Date()) {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const { loading, error, run } = useLoadingTask();

  const load = useCallback(async () => {
    if (!householdId) return;
    const yearMonth = format(currentDate, 'yyyy-MM');
    
    await run(async () => {
      const result = await reportService.generateBalanceSheet(householdId, yearMonth);
      setData(result);
    });
  }, [householdId, currentDate, run]);

  useEffect(() => {
    load();
  }, [load]);

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  return {
    data,
    loading,
    error,
    currentDate,
    setCurrentDate,
    nextMonth,
    prevMonth,
    reload: load
  };
}
