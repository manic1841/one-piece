import { useCallback, useEffect, useRef, useState } from 'react';

import { addMonths, format, subMonths } from 'date-fns';

import { getStoredReportUseCase } from '@/application/report/use_cases/getStoredReportUseCase';
import { type CashFlowData } from '@/domains/report/schemas';
import { type CashFlowVM, mapCashFlowToVM } from '@/ui/features/report/viewmodels/reportDisplay.vm';
import { getErrorMessage } from '@/ui/hooks/getErrorMessage';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

type ReportMode = 'MONTHLY' | 'YEARLY';

const LOAD_ERROR = '無法載入現金流量表';

export function useCashFlow(
  householdId: string,
  controlledDate?: Date,
  reportMode: ReportMode = 'MONTHLY',
) {
  const [data, setData] = useState<CashFlowVM | null>(null);
  const [internalDate, setInternalDate] = useState(new Date());
  const inFlightRef = useRef<AbortController | null>(null);
  const { loading, error, run } = useLoadingTask();
  const errorMessage = error === null ? null : getErrorMessage(error, LOAD_ERROR);
  const auth = useAuthIdentity();

  const currentDate = controlledDate || internalDate;
  const yearMonth =
    reportMode === 'YEARLY' ? format(currentDate, 'yyyy') : format(currentDate, 'yyyy-MM');

  const fetchReport = useCallback(async () => {
    // Paging months quickly supersedes the previous fetch; without this the
    // slower, older report could land last and win.
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    await run(
      async () =>
        getStoredReportUseCase.execute({
          householdId,
          yearMonth,
          kind: 'cashFlow',
          auth,
        }),
      {
        signal: controller.signal,
        writeBack: (result) =>
          setData(result.ok && result.value ? mapCashFlowToVM(result.value as CashFlowData) : null),
      },
    );
  }, [householdId, yearMonth, auth, run]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const nextMonth = () => setInternalDate((prev) => addMonths(prev, 1));
  const prevMonth = () => setInternalDate((prev) => subMonths(prev, 1));

  return {
    data,
    loading,
    error,
    errorMessage,
    currentDate,
    setCurrentDate: setInternalDate,
    nextMonth,
    prevMonth,
    refresh: fetchReport,
  };
}
