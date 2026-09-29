import { useCallback, useEffect, useState } from 'react';

import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { type AuthContext } from '@/application/types';
import { type TransactionValidationIssue } from '@/domains/transaction_validation/validator';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

interface UseTransactionValidationStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
}

interface ValidationData {
  issues: TransactionValidationIssue[];
  checkedCount: number;
}

/**
 * Loads the month's transaction-validation evidence (spec 05 stage 02). A read
 * failure returns null so the month-keyed state stays unset rather than
 * reporting "no issues" for a batch we never validated.
 */
const fetchValidation = async ({
  householdId,
  selectedYearMonth,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  auth: AuthContext;
}): Promise<ValidationData | null> => {
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
    return null;
  }
};

/**
 * Stage controller for TRANSACTION_VALIDATION: owns the month's validation
 * evidence — the per-transaction issues Step 7 surfaces and the checked count
 * it reports. Validation is read-only (no draft, no gate, no write path); a
 * single load serves both the stage's own evidence and Step 7's N/M count, so
 * the batch is validated once per refresh.
 */
export const useTransactionValidationStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
}: UseTransactionValidationStageArgs): ReturnType<typeof useConfirmStageControl> & {
  transactionIssues: TransactionValidationIssue[];
  checkedCount: number;
} => {
  const auth = useAuthIdentity();
  // Keyed by year-month: a value loaded for a previous month reads as empty
  // under the current selection, so a month switch never shows the last
  // month's issues while the new month loads.
  const [data, setData] = useState<{ yearMonth: string; data: ValidationData } | null>(null);
  const current = data?.yearMonth === selectedYearMonth ? data.data : null;

  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    let cancelled = false;

    const load = async () => {
      const result = await fetchValidation({ householdId, selectedYearMonth, auth });
      if (cancelled || !result) return;
      setData({ yearMonth: selectedYearMonth, data: result });
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [auth, householdId, selectedYearMonth]);

  const refresh = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    const result = await fetchValidation({ householdId, selectedYearMonth, auth });
    if (!result) return;
    setData({ yearMonth: selectedYearMonth, data: result });
  }, [auth, householdId, selectedYearMonth]);

  const control = useConfirmStageControl({
    stageId: 'TRANSACTION_VALIDATION',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'TRANSACTION_VALIDATION' }),
    refresh,
  });

  return {
    ...control,
    transactionIssues: current?.issues ?? [],
    checkedCount: current?.checkedCount ?? 0,
  };
};
