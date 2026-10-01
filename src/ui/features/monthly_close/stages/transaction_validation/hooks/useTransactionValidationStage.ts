import { useCallback } from 'react';

import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { type AuthContext } from '@/application/types';
import { type TransactionValidationIssue } from '@/domains/transaction_validation/validator';
import { type CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useStageLoader } from '@/ui/features/monthly_close/hooks/useStageLoader';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

interface UseTransactionValidationStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
  enabled?: boolean;
}

interface ValidationData {
  issues: TransactionValidationIssue[];
  checkedCount: number;
}

const LOAD_ERROR = '無法載入交易驗證結果，請稍後再試。';

/**
 * Loads the month's transaction-validation evidence (spec 05 stage 02). A read
 * failure throws the canned message so the surface shows copy the consumer
 * owns.
 */
const fetchValidation = async ({
  householdId,
  selectedYearMonth,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  auth: AuthContext;
}): Promise<ValidationData> => {
  try {
    return await validateMonthTransactionsUseCase.execute({
      householdId,
      year: Number(selectedYearMonth.slice(0, 4)),
      month: Number(selectedYearMonth.slice(5, 7)),
      auth,
    });
  } catch (caught) {
    logger.warn('Failed to load transaction validation', 'useTransactionValidationStage', {
      caught,
    });
    throw new Error(LOAD_ERROR);
  }
};

/** Stage controller for TRANSACTION_VALIDATION: the month's per-transaction validation issues. */
export const useTransactionValidationStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
  enabled = true,
}: UseTransactionValidationStageArgs): CloseStageControl<'TRANSACTION_VALIDATION'> & {
  transactionIssues: TransactionValidationIssue[];
  checkedCount: number;
  errorMessage: string | null;
  isReady: boolean;
} => {
  const auth = useAuthIdentity();

  const load = useCallback(
    () => fetchValidation({ householdId, selectedYearMonth, auth }),
    [auth, householdId, selectedYearMonth],
  );
  const { data, errorMessage, isReady, refresh } = useStageLoader<ValidationData>({
    key: selectedYearMonth,
    enabled: enabled && householdId !== '' && selectedYearMonth !== '',
    load,
  });

  const control = useConfirmStageControl({
    stageId: 'TRANSACTION_VALIDATION',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'TRANSACTION_VALIDATION' }),
    refresh,
  });

  return {
    ...control,
    transactionIssues: data?.issues ?? [],
    checkedCount: data?.checkedCount ?? 0,
    errorMessage,
    isReady,
  };
};
