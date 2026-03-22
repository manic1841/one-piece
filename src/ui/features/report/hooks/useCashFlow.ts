import { useCallback, useEffect, useState } from 'react';

import { addMonths, format, subMonths } from 'date-fns';

import { reportService } from '@/domains/report/reportService';
import { type CashFlowData } from '@/domains/report/schemas';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';

export function useCashFlow(householdId: string, controlledDate?: Date) {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [internalDate, setInternalDate] = useState(new Date());
  const { getLabel } = useLedgerCodes();

  const currentDate = controlledDate || internalDate;
  const yearMonth = format(currentDate, 'yyyy-MM');

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await reportService.generateCashFlow(
        householdId,
        yearMonth,
        (code, fallbackLabel) => {
          const resolved = getLabel(code);
          return resolved === code ? fallbackLabel || code : resolved;
        },
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [householdId, yearMonth, getLabel]);

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
