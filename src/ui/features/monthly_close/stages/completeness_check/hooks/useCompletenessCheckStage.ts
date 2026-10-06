import { useCallback } from 'react';

import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import {
  type SettlementReadiness,
  getSettlementReadinessUseCase,
} from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { type AuthContext } from '@/application/types';
import { type TransactionValidationIssue } from '@/domains/transaction_validation/validator';
import { type CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useStageLoader } from '@/ui/features/monthly_close/hooks/useStageLoader';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

interface UseCompletenessCheckStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
}

interface CompletenessData {
  readiness: SettlementReadiness;
  transactionIssues: TransactionValidationIssue[];
}

const LOAD_ERROR = '無法載入結算就緒狀態，請稍後再試。';

/**
 * Loads the month's completeness evidence: the settlement readiness the
 * COMPLETENESS_CHECK aggregates, and the transaction-validation issues it
 * renders. A read failure throws the canned message so the surface shows copy
 * the consumer owns.
 */
const fetchCompleteness = async ({
  householdId,
  selectedYearMonth,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  auth: AuthContext;
}): Promise<CompletenessData> => {
  const year = Number(selectedYearMonth.slice(0, 4));
  const month = Number(selectedYearMonth.slice(5, 7));
  try {
    const [readiness, validation] = await Promise.all([
      getSettlementReadinessUseCase.execute({ householdId, year, month, auth }),
      validateMonthTransactionsUseCase.execute({ householdId, year, month, auth }),
    ]);
    return {
      readiness,
      transactionIssues: validation.issues,
    };
  } catch (caught) {
    logger.warn('Failed to load completeness evidence', 'useCompletenessCheckStage', { caught });
    throw new Error(LOAD_ERROR);
  }
};

/** Stage controller for COMPLETENESS_CHECK: the month's settlement readiness and transaction issues. */
export const useCompletenessCheckStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
}: UseCompletenessCheckStageArgs): CloseStageControl<'COMPLETENESS_CHECK'> & {
  readiness: SettlementReadiness | null;
  transactionIssues: TransactionValidationIssue[];
  errorMessage: string | null;
  isLoaded: boolean;
} => {
  const auth = useAuthIdentity();

  const load = useCallback(
    () => fetchCompleteness({ householdId, selectedYearMonth, auth }),
    [auth, householdId, selectedYearMonth],
  );
  const { data, errorMessage, isLoaded, refresh } = useStageLoader<CompletenessData>({
    enabled: householdId !== '' && selectedYearMonth !== '',
    load,
  });

  const control = useConfirmStageControl({
    stageId: 'COMPLETENESS_CHECK',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'COMPLETENESS_CHECK' }),
    refresh,
  });

  return {
    ...control,
    readiness: data?.readiness ?? null,
    transactionIssues: data?.transactionIssues ?? [],
    errorMessage,
    isLoaded,
  };
};
