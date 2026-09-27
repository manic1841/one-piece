import { useCallback } from 'react';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { type CloseStageControl } from './closeStageControl';

interface UseConfirmStageControlArgs {
  stageId: CloseStageControl['stageId'];
  confirmingStageId: string | null;
  buildRequest: CloseStageControl['buildRequest'];
  /** The stage's own gate; returning true blocks the submit. */
  shouldBlock?: CloseStageControl['shouldBlock'];
  /** Ask before submitting (empty-stage warning); false aborts. */
  confirmGate?: () => Promise<boolean>;
  afterConfirm?: CloseStageControl['afterConfirm'];
}

/**
 * Shared adapter for stages whose control is a plain confirm with no draft
 * state of their own beyond the per-stage payload.
 */
export const useConfirmStageControl = ({
  stageId,
  confirmingStageId,
  buildRequest,
  shouldBlock,
  confirmGate,
  afterConfirm,
}: UseConfirmStageControlArgs): CloseStageControl => {
  const blocked = useCallback((): boolean => (shouldBlock ? shouldBlock() : false), [shouldBlock]);

  return {
    stageId,
    confirming: confirmingStageId === stageId,
    buildRequest,
    shouldBlock: blocked,
    confirmGate,
    afterConfirm: afterConfirm ?? (() => undefined),
  };
};

export type { CloseStageControl };

export const EMPTY_STAGE_CONFIRM_OPTIONS = {
  title: MONTHLY_CLOSE_LABELS.EMPTY_STAGE_WARNING_TITLE,
  context: MONTHLY_CLOSE_LABELS.EMPTY_STAGE_WARNING_CONTEXT,
  consequence: MONTHLY_CLOSE_LABELS.EMPTY_STAGE_WARNING_CONSEQUENCE,
  confirmLabel: MONTHLY_CLOSE_LABELS.RECONFIRM_ACTION,
  cancelLabel: MONTHLY_CLOSE_LABELS.CANCEL,
} as const;

export const useClosePeriodStageControl = (
  confirmingStageId: string | null,
): CloseStageControl => ({
  stageId: 'CLOSE_PERIOD',
  confirming: confirmingStageId === 'CLOSE_PERIOD',
  buildRequest: () => ({ stageId: 'CLOSE_PERIOD' }),
  shouldBlock: () => false,
  afterConfirm: () => undefined,
});
