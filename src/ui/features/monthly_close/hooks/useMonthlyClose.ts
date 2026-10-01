import { useCallback, useMemo, useRef, useState } from 'react';

import {
  MonthlyCloseCommandError,
  MonthlyCloseCommandErrorCode,
} from '@/application/monthly_close/errors';
import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { type MonthlyCloseConfirmRequest } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { type MonthlyCloseConfirmResult } from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import { type CloseStageId, type FinancialPeriod } from '@/domains/financial_period/schemas';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { formatYearMonth } from '@/ui/utils';

import { mapPeriodToPageVM } from '../mappers/monthlyClose.mappers';
import type { MonthlyClosePageVM } from '../viewmodels/monthlyClose.vm';

interface UseMonthlyCloseParams {
  householdId: string;
  userEmail: string;
}
const errorText = (err: unknown, fallback: string): string => {
  if (err instanceof MonthlyCloseCommandError) {
    if (err.code === MonthlyCloseCommandErrorCode.STAGE_ALREADY_COMPLETED) {
      return MONTHLY_CLOSE_LABELS.STAGE_ALREADY_COMPLETED_ERROR;
    }
    if (err.code === MonthlyCloseCommandErrorCode.STAGE_NOT_WALK_POSITION) {
      return MONTHLY_CLOSE_LABELS.WALK_GUIDANCE;
    }
    return `${fallback}（${err.code}）`;
  }
  return fallback;
};

export const useMonthlyClose = ({ householdId, userEmail }: UseMonthlyCloseParams) => {
  const auth = useAuthIdentity();
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() =>
    formatYearMonth(new Date().getFullYear(), new Date().getMonth() + 1),
  );
  const [period, setPeriod] = useState<FinancialPeriod | null>(null);
  const [confirmingStageId, setConfirmingStageId] = useState<CloseStageId | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageVM: MonthlyClosePageVM = useMemo(
    () => mapPeriodToPageVM(period, selectedYearMonth),
    [period, selectedYearMonth],
  );

  // Monotonic request sequence: every period-mutating call takes a ticket
  // before awaiting and only writes back if it is still the latest. A month
  // switch bumps it too, so a slow response for the month we just left can
  // never overwrite the new month's period — and two same-month operations
  // (a start racing a confirm) cannot clobber each other either.
  const requestSeqRef = useRef(0);
  const beginRequest = useCallback(() => (requestSeqRef.current += 1), []);
  const isLatestRequest = useCallback((seq: number) => seq === requestSeqRef.current, []);

  const selectYearMonth = useCallback((yearMonth: string) => {
    requestSeqRef.current += 1;
    setSelectedYearMonth(yearMonth);
    setPeriod(null);
    setError(null);
  }, []);

  const start = useCallback(async (): Promise<FinancialPeriod | null> => {
    if (!householdId || !selectedYearMonth) return null;
    const seq = beginRequest();
    setIsStarting(true);
    setError(null);
    try {
      const result = await monthlyCloseWorkflowUseCase.start({
        householdId,
        yearMonth: selectedYearMonth,
        userEmail,
        auth,
      });
      if (!isLatestRequest(seq)) return null;
      setPeriod(result);
      return result;
    } catch (err) {
      if (!isLatestRequest(seq)) return null;
      setError(errorText(err, MONTHLY_CLOSE_LABELS.START_ERROR));
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [auth, beginRequest, householdId, isLatestRequest, selectedYearMonth, userEmail]);

  const reopen = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return null;
    const seq = beginRequest();
    setIsStarting(true);
    setError(null);
    try {
      const result = await monthlyCloseWorkflowUseCase.reopen({
        householdId,
        yearMonth: selectedYearMonth,
        userEmail,
        auth,
      });
      if (!isLatestRequest(seq)) return null;
      setPeriod(result);
      return result;
    } catch (err) {
      if (!isLatestRequest(seq)) return null;
      setError(errorText(err, MONTHLY_CLOSE_LABELS.REOPEN_ERROR));
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [auth, beginRequest, householdId, isLatestRequest, selectedYearMonth, userEmail]);

  const confirmStage = useCallback(
    async (
      request: Omit<MonthlyCloseConfirmRequest, 'householdId' | 'yearMonth' | 'userEmail' | 'auth'>,
    ): Promise<MonthlyCloseConfirmResult | null> => {
      if (!householdId || !selectedYearMonth) return null;
      const seq = beginRequest();
      setConfirmingStageId(request.stageId);
      setError(null);
      try {
        const result = await monthlyCloseWorkflowUseCase.confirmStage({
          householdId,
          yearMonth: selectedYearMonth,
          userEmail,
          auth,
          ...request,
        });
        if (!isLatestRequest(seq)) return null;
        setPeriod(result.period);
        return result;
      } catch (err) {
        if (!isLatestRequest(seq)) return null;
        setError(errorText(err, MONTHLY_CLOSE_LABELS.CONFIRM_ERROR));
        return null;
      } finally {
        setConfirmingStageId(null);
      }
    },
    [auth, beginRequest, householdId, isLatestRequest, selectedYearMonth, userEmail],
  );

  const resetStagesFrom = useCallback(
    async (fromStageId: CloseStageId): Promise<FinancialPeriod | null> => {
      if (!householdId || !selectedYearMonth) return null;
      const seq = beginRequest();
      setIsStarting(true);
      setError(null);
      try {
        const result = await monthlyCloseWorkflowUseCase.resetStagesFrom({
          householdId,
          yearMonth: selectedYearMonth,
          userEmail,
          auth,
          fromStageId,
        });
        if (!isLatestRequest(seq)) return null;
        setPeriod(result);
        return result;
      } catch (err) {
        if (!isLatestRequest(seq)) return null;
        setError(errorText(err, MONTHLY_CLOSE_LABELS.CONFIRM_ERROR));
        return null;
      } finally {
        setIsStarting(false);
      }
    },
    [auth, beginRequest, householdId, isLatestRequest, selectedYearMonth, userEmail],
  );

  return {
    selectedYearMonth,
    period,
    pageVM,
    confirmingStageId,
    isStarting,
    error,
    selectYearMonth,
    start,
    reopen,
    confirmStage,
    resetStagesFrom,
  };
};
