import { useCallback, useEffect, useState } from 'react';

import { format } from 'date-fns';

import { reportService } from '@/domains/report/reportService';
import { type BalanceSheetData } from '@/domains/report/schemas';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useBalanceSheet(householdId: string, controlledDate?: Date) {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [internalDate, setInternalDate] = useState<Date>(new Date());
  const { getLabel } = useLedgerCodes();
  const { loading, error, run } = useLoadingTask();

  const currentDate = controlledDate || internalDate;

  const load = useCallback(async () => {
    if (!householdId) return;
    const yearMonth = format(currentDate, 'yyyy-MM');

    await run(async () => {
      const result = await reportService.generateBalanceSheet(
        householdId,
        yearMonth,
        (code, fallbackLabel) => {
          const resolved = getLabel(code);
          return resolved === code ? fallbackLabel || code : resolved;
        },
      );
      setData(result);
    });
  }, [householdId, currentDate, run, getLabel]);

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
