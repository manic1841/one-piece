import { useCallback } from 'react';

import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { type AuthContext } from '@/application/types';
import { type TransactionValidationIssue } from '@/domains/transaction_validation/validator';
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

/**
 * Stage controller for TRANSACTION_VALIDATION: owns the month's validation
 * evidence — the per-transaction issues Step 7 surfaces and the checked count
 * it reports. Validation is read-only (no draft, no gate, no write path); a
 * single load serves both the stage's own evidence and Step 7's N/M count, so
 * the batch is validated once per refresh. Loading goes through `useStageLoader`,
 * which owns the period-keyed value, the supersede, the "failed run writes
 * nothing" rule, and the failure shape (a failed month switch reads empty while
 * a failed same-month refresh keeps the last known values, so consumers gate on
 * `errorMessage` — never on the data alone, #226).
 */
export const useTransactionValidationStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
  enabled = true,
}: UseTransactionValidationStageArgs): ReturnType<typeof useConfirmStageControl> & {
  transactionIssues: TransactionValidationIssue[];
  checkedCount: number;
  errorMessage: string | null;
} => {
  const auth = useAuthIdentity();

  const load = useCallback(
    () => fetchValidation({ householdId, selectedYearMonth, auth }),
    [auth, householdId, selectedYearMonth],
  );
  const { data, errorMessage, refresh } = useStageLoader<ValidationData>({
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
  };
};
