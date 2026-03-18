import { useState, useEffect, useCallback } from 'react';
import { reportService } from '@/domains/report/reportService';
import { type CashFlowData } from '@/domains/report/schemas';
import { format, addMonths, subMonths } from 'date-fns';

export function useCashFlow(householdId: string) {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const yearMonth = format(currentDate, 'yyyy-MM');

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await reportService.generateCashFlow(householdId, yearMonth);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [householdId, yearMonth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const nextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate(prev => subMonths(prev, 1));

  return {
    data,
    loading,
    error,
    currentDate,
    nextMonth,
    prevMonth,
    refresh: fetchReport
  };
}
