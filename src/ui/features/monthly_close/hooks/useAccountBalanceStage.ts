import { useState } from 'react';

import type { AccountBalanceInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';

import type { CloseStageControl } from './closeStageControl';
import { useConfirmStageControl } from './useConfirmStageControl';

interface UseAccountBalanceStageArgs {
  confirmingStageId: string | null;
}

/**
 * Stage controller for ACCOUNT_BALANCE: owns the ending-balance draft; the
 * snapshot prefill writes into the same state through `setBalances`.
 */
export const useAccountBalanceStage = ({
  confirmingStageId,
}: UseAccountBalanceStageArgs): CloseStageControl & {
  balances: AccountBalanceInput[];
  setBalances: React.Dispatch<React.SetStateAction<AccountBalanceInput[]>>;
} => {
  const [balances, setBalances] = useState<AccountBalanceInput[]>([]);

  const control = useConfirmStageControl({
    stageId: 'ACCOUNT_BALANCE',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'ACCOUNT_BALANCE', accountBalances: balances }),
  });

  return { ...control, balances, setBalances };
};
