import { useCallback, useMemo, useState } from 'react';

import {
  MonthlyCloseCommandError,
  MonthlyCloseCommandErrorCode,
} from '@/application/monthly_close/errors';
import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { type MonthlyCloseConfirmRequest } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import {
  type CompletenessActivity,
  checkSettlementCompletenessUseCase,
} from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { type CloseStageId, type FinancialPeriod } from '@/domains/financial_period/schemas';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { formatYearMonth } from '@/ui/utils';
import { logger } from '@/utils/logger';

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
  const [anomalies, setAnomalies] = useState<CompletenessActivity[]>([]);
  const [transactionIssues, setTransactionIssues] = useState<
    { transactionId: string; description: string; reason: string }[]
  >([]);
  const [cashFlowAdjustment, setCashFlowAdjustment] = useState<number | null>(null);
  const [reportsPersisted, setReportsPersisted] = useState<boolean | null>(null);

  const pageVM: MonthlyClosePageVM = useMemo(
    () => mapPeriodToPageVM(period, selectedYearMonth),
    [period, selectedYearMonth],
  );

  const selectYearMonth = useCallback((yearMonth: string) => {
    setSelectedYearMonth(yearMonth);
    setPeriod(null);
    setError(null);
    setAnomalies([]);
    setTransactionIssues([]);
    setCashFlowAdjustment(null);
    setReportsPersisted(null);
  }, []);

  const start = useCallback(async (): Promise<FinancialPeriod | null> => {
    if (!householdId || !selectedYearMonth) return null;
    setIsStarting(true);
    setError(null);
    try {
      const result = await monthlyCloseWorkflowUseCase.start({
        householdId,
        yearMonth: selectedYearMonth,
        userEmail,
        auth,
      });
      setPeriod(result);
      return result;
    } catch (err) {
      setError(errorText(err, MONTHLY_CLOSE_LABELS.START_ERROR));
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [auth, householdId, selectedYearMonth, userEmail]);

  const reopen = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return null;
    setIsStarting(true);
    setError(null);
    try {
      const result = await monthlyCloseWorkflowUseCase.reopen({
        householdId,
        yearMonth: selectedYearMonth,
        userEmail,
        auth,
      });
      setPeriod(result);
      return result;
    } catch (err) {
      setError(errorText(err, MONTHLY_CLOSE_LABELS.REOPEN_ERROR));
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [auth, householdId, selectedYearMonth, userEmail]);

  const confirmStage = useCallback(
    async (
      request: Omit<MonthlyCloseConfirmRequest, 'householdId' | 'yearMonth' | 'userEmail' | 'auth'>,
    ): Promise<FinancialPeriod | null> => {
      if (!householdId || !selectedYearMonth) return null;
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
        setPeriod(result);
        return result;
      } catch (err) {
        setError(errorText(err, MONTHLY_CLOSE_LABELS.CONFIRM_ERROR));
        return null;
      } finally {
        setConfirmingStageId(null);
      }
    },
    [auth, householdId, selectedYearMonth, userEmail],
  );

  const refreshStageEvidence = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    const year = Number(selectedYearMonth.slice(0, 4));
    const month = Number(selectedYearMonth.slice(5, 7));

    try {
      const completeness = await checkSettlementCompletenessUseCase.execute({
        householdId,
        year,
        month,
        auth,
      });
      setAnomalies(completeness.anomalies);

      const validation = await validateMonthTransactionsUseCase.execute({
        householdId,
        year,
        month,
        auth,
      });
      setTransactionIssues(validation.issues);

      const persistence = await getReportPersistenceStateUseCase.execute({
        householdId,
        yearMonth: selectedYearMonth,
      });
      setReportsPersisted(persistence.isPersisted);

      if (!persistence.isPersisted) {
        setCashFlowAdjustment(null);
        return;
      }

      try {
        const preview = await previewFinancialReportsWorkflow.execute({
          householdId,
          auth,
          year,
          month,
        });
        setCashFlowAdjustment(preview.cashFlow.adjustment);
      } catch (previewError) {
        logger.warn('Failed to preview cash flow adjustment', 'useMonthlyClose', {
          previewError,
        });
        setCashFlowAdjustment(null);
      }
    } catch (evidenceError) {
      logger.warn('Failed to load stage evidence', 'useMonthlyClose', {
        evidenceError,
      });
      setError(MONTHLY_CLOSE_LABELS.LOAD_ERROR);
    }
  }, [auth, householdId, selectedYearMonth]);

  return {
    auth,
    selectedYearMonth,
    period,
    pageVM,
    confirmingStageId,
    isStarting,
    error,
    anomalies,
    transactionIssues,
    cashFlowAdjustment,
    reportsPersisted,
    selectYearMonth,
    start,
    reopen,
    confirmStage,
    refreshStageEvidence,
  };
};
