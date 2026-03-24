import { useCallback, useEffect, useState } from 'react';

import { addMonths, format, subMonths } from 'date-fns';

import { reportService } from '@/domains/report/reportService';
import { type CashFlowData } from '@/domains/report/schemas';

type ReportMode = 'MONTHLY' | 'YEARLY';

export function useCashFlow(
  householdId: string,
  controlledDate?: Date,
  reportMode: ReportMode = 'MONTHLY',
) {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [internalDate, setInternalDate] = useState(new Date());

  const currentDate = controlledDate || internalDate;
  const yearMonth =
    reportMode === 'YEARLY' ? format(currentDate, 'yyyy') : format(currentDate, 'yyyy-MM');

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await reportService.getStoredCashFlow(householdId, yearMonth);
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

  const nextMonth = () => setInternalDate((prev) => addMonths(prev, 1));
  const prevMonth = () => setInternalDate((prev) => subMonths(prev, 1));

  return {
    data,
    loading,
    error,
    currentDate,
    setCurrentDate: setInternalDate,
    nextMonth,
    prevMonth,
    refresh: fetchReport,
  };
}
