import type { ReportLabelResolver } from '@/domains/report/reportCalculations';

import type { CloseStageControl } from './closeStageControl';
import { useConfirmStageControl } from './useConfirmStageControl';

interface UseFinancialReportsStageArgs {
  confirmingStageId: string | null;
  labelResolver: ReportLabelResolver;
}

/**
 * Stage controller for FINANCIAL_REPORTS: the label resolver rides the confirm
 * payload; there is no draft state and no gate.
 */
export const useFinancialReportsStage = ({
  confirmingStageId,
  labelResolver,
}: UseFinancialReportsStageArgs): CloseStageControl =>
  useConfirmStageControl({
    stageId: 'FINANCIAL_REPORTS',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'FINANCIAL_REPORTS', labelResolver }),
  });
