import { useCallback, useEffect, useRef, useState } from 'react';

import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { type AuthContext } from '@/application/types';
import { type TransactionValidationIssue } from '@/domains/transaction_validation/validator';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
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

const LOAD_ERROR = '無法載入交易驗證結果，請稍後再試。';

/**
 * Loads the month's transaction-validation evidence (spec 05 stage 02). A read
 * failure throws the canned message so the surface shows copy the consumer
 * owns, and the month-keyed state stays unset rather than reporting "no
 * issues" for a batch we never validated.
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
 * the batch is validated once per refresh.
 */
export const useTransactionValidationStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
}: UseTransactionValidationStageArgs): ReturnType<typeof useConfirmStageControl> & {
  transactionIssues: TransactionValidationIssue[];
  checkedCount: number;
  errorMessage: string | null;
} => {
  const auth = useAuthIdentity();
  // Keyed by year-month: a value loaded for a previous month reads as empty
  // under the current selection, so a month switch never shows the last
  // month's issues while the new month loads.
  const [data, setData] = useState<{ yearMonth: string; data: ValidationData } | null>(null);
  const { errorMessage, run } = useLoadingTask();
  // Paging months faster than the validation completes supersedes the previous
  // load; without this the slower, older month could land last and win.
  const inFlightRef = useRef<AbortController | null>(null);
  const current = data?.yearMonth === selectedYearMonth ? data.data : null;

  const load = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    await run(() => fetchValidation({ householdId, selectedYearMonth, auth }), {
      signal: controller.signal,
      // A failed run writes nothing, so the stage reports no issues rather than
      // the previous month's; the error channel carries the canned message.
      writeBack: (result) => {
        if (!result.ok) return;
        setData({ yearMonth: selectedYearMonth, data: result.value });
      },
    });
  }, [auth, householdId, run, selectedYearMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  const control = useConfirmStageControl({
    stageId: 'TRANSACTION_VALIDATION',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'TRANSACTION_VALIDATION' }),
    refresh: load,
  });

  return {
    ...control,
    transactionIssues: current?.issues ?? [],
    checkedCount: current?.checkedCount ?? 0,
    errorMessage,
  };
};
