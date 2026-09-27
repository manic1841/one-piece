import type { DebtRepaymentInput } from '@/application/monthly_close/use_cases/monthlyCloseRequests';

import type { CloseStageControl } from './closeStageControl';
import { useConfirmStageControl } from './useConfirmStageControl';

interface UseDebtRepaymentStageArgs {
  confirmingStageId: string | null;
  repayments: DebtRepaymentInput[];
  /** Clear the repayment draft (and its section metas) on month switch. */
  resetRepayments: () => void;
}

/**
 * Stage controller for DEBT_REPAYMENT: the repayment rows live in the prefill
 * hook (`useDebtRepaymentPrefill`); the confirm payload submits the whole
 * record. No gate and no post-confirm effect.
 */
export const useDebtRepaymentStage = ({
  confirmingStageId,
  repayments,
  resetRepayments,
}: UseDebtRepaymentStageArgs): CloseStageControl =>
  useConfirmStageControl({
    stageId: 'DEBT_REPAYMENT',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'DEBT_REPAYMENT', repayments }),
    resetDraft: resetRepayments,
  });
