import type { DebtRepaymentInput } from '@/application/monthly_close/use_cases/monthlyCloseRequests';

import type { CloseStageControl } from './closeStageControl';
import { useConfirmStageControl } from './useConfirmStageControl';

interface UseDebtRepaymentStageArgs {
  confirmingStageId: string | null;
  repayments: DebtRepaymentInput[];
}

/**
 * Stage controller for DEBT_REPAYMENT: the repayment rows live in the prefill
 * hook (`useDebtRepaymentPrefill`); the confirm payload submits the whole
 * record. No gate and no post-confirm effect.
 */
export const useDebtRepaymentStage = ({
  confirmingStageId,
  repayments,
}: UseDebtRepaymentStageArgs): CloseStageControl =>
  useConfirmStageControl({
    stageId: 'DEBT_REPAYMENT',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'DEBT_REPAYMENT', repayments }),
  });
