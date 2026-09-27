import { useState } from 'react';

import type { CloseStageControl } from './closeStageControl';
import { useConfirmStageControl } from './useConfirmStageControl';

type PortfolioCashFlows = Record<string, { deposits: number; withdrawals: number }>;

interface UsePortfolioCashFlowStageArgs {
  confirmingStageId: string | null;
}

/**
 * Stage controller for PORTFOLIO_CASH_FLOW: owns the cash-flow draft the
 * sections edit; the confirm payload submits the whole record.
 */
export const usePortfolioCashFlowStage = ({
  confirmingStageId,
}: UsePortfolioCashFlowStageArgs): CloseStageControl & {
  cashFlows: PortfolioCashFlows;
  setCashFlows: React.Dispatch<React.SetStateAction<PortfolioCashFlows>>;
} => {
  const [cashFlows, setCashFlows] = useState<PortfolioCashFlows>({});

  const control = useConfirmStageControl({
    stageId: 'PORTFOLIO_CASH_FLOW',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'PORTFOLIO_CASH_FLOW', portfolioCashFlows: cashFlows }),
  });

  return { ...control, cashFlows, setCashFlows };
};
