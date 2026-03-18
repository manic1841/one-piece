import { useCallback, useEffect, useState } from 'react';
import { reportService } from '@/domains/report/reportService';
import { type IncomeStatementData } from '@/domains/report/schemas';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { format } from 'date-fns';

export function useIncomeStatement(householdId: string, initialDate: Date = new Date()) {
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const { loading, error, run } = useLoadingTask();

  const load = useCallback(async () => {
    if (!householdId) return;
    const yearMonth = format(currentDate, 'yyyy-MM');
    
    await run(async () => {
      // Try to get stored report first? User said generate on the fly is fine too if handled in UI.
      // But generateIncomeStatement already fetches entries.
      const result = await reportService.generateIncomeStatement(householdId, yearMonth);
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
