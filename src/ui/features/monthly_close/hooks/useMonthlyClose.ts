import { useCallback, useMemo, useState } from 'react';

import { MonthlyCloseCommandError } from '@/application/monthly_close/errors';
import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import {
  type AccountBalanceInput,
  type DebtRepaymentInput,
  type MonthlyCloseConfirmRequest,
  type SecuritiesTradeInput,
} from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import {
  checkSettlementCompletenessUseCase,
  type CompletenessActivity,
} from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import {
  type CloseStageId,
  type FinancialPeriod,
} from '@/domains/financial_period/schemas';
import { logger } from '@/utils/logger';
import { useAuthContext } from '@/ui/hooks/useAuthContext';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { mapPeriodToPageVM } from '../mappers/monthlyClose.mappers';
import type { MonthlyClosePageVM } from '../viewmodels/monthlyClose.vm';

interface UseMonthlyCloseParams {
  householdId: string;
  userEmail: string;
}
const errorText = (err: unknown, fallback: string): string => {
  if (err instanceof MonthlyCloseCommandError) {
    return `${fallback}（${err.code}）`;
  }
  return fallback;
};

export const useMonthlyClose = ({ householdId, userEmail }: UseMonthlyCloseParams) => {
  const auth = useAuthContext();
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('');
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

  const selectYearMonth = useCallback(
    (yearMonth: string) => {
      setSelectedYearMonth(yearMonth);
      setPeriod(null);
      setError(null);
      setAnomalies([]);
      setTransactionIssues([]);
      setCashFlowAdjustment(null);
      setReportsPersisted(null);
    },
    [],
  );

  const start = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
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
    } catch (err) {
      setError(errorText(err, MONTHLY_CLOSE_LABELS.START_ERROR));
    } finally {
      setIsStarting(false);
    }
  }, [auth, householdId, selectedYearMonth, userEmail]);

  const confirmStage = useCallback(
    async (request: Omit<MonthlyCloseConfirmRequest, 'householdId' | 'yearMonth' | 'userEmail' | 'auth'>) => {
      if (!householdId || !selectedYearMonth) return;
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
      } catch (err) {
        setError(errorText(err, MONTHLY_CLOSE_LABELS.CONFIRM_ERROR));
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
    confirmStage,
    refreshStageEvidence,
  };
};

export type MonthlyCloseStageInputs = {
  accountBalances?: AccountBalanceInput[];
  securities?: {
    buys: SecuritiesTradeInput[];
    sells: SecuritiesTradeInput[];
  };
  portfolioCashFlows?: Record<string, { deposits: number; withdrawals: number }>;
  repayments?: DebtRepaymentInput[];
};
