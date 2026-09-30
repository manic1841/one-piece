import { type CloseStageId } from '@/domains/financial_period/schemas';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { type CloseStageControl } from './closeStageControl';

interface UseConfirmStageControlArgs {
  stageId: CloseStageControl['stageId'];
  confirmingStageId: string | null;
  buildRequest: CloseStageControl['buildRequest'];
  /** Ask before submitting (empty-stage warning); false aborts. */
  confirmGate?: () => Promise<boolean>;
  afterConfirm?: CloseStageControl['afterConfirm'];
  /**
   * Month-switch reset (back to `[]` / `{}` / empty rows); stages without a
   * draft leave it unset and the adapter makes it a no-op.
   */
  resetDraft?: CloseStageControl['resetDraft'];
  /**
   * Reloads the stage's own loaded data after an external change; stages that
   * load nothing leave it unset and the adapter omits it.
   */
  refresh?: CloseStageControl['refresh'];
  /** Keep the stage view open after a successful confirm (FINANCIAL_REPORTS). */
  keepsViewOnConfirm?: CloseStageControl['keepsViewOnConfirm'];
}

/**
 * Shared adapter for stages whose control is a plain confirm with no draft
 * state of their own beyond the per-stage payload.
 */
export const useConfirmStageControl = ({
  stageId,
  confirmingStageId,
  buildRequest,
  confirmGate,
  afterConfirm,
  resetDraft,
  refresh,
  keepsViewOnConfirm,
}: UseConfirmStageControlArgs): CloseStageControl => {
  return {
    stageId,
    confirming: confirmingStageId === stageId,
    buildRequest,
    confirmGate,
    afterConfirm: afterConfirm ?? (() => undefined),
    resetDraft: resetDraft ?? (() => undefined),
    refresh,
    keepsViewOnConfirm,
  };
};

export const EMPTY_STAGE_CONFIRM_OPTIONS = {
  title: MONTHLY_CLOSE_LABELS.EMPTY_STAGE_WARNING_TITLE,
  context: MONTHLY_CLOSE_LABELS.EMPTY_STAGE_WARNING_CONTEXT,
  consequence: MONTHLY_CLOSE_LABELS.EMPTY_STAGE_WARNING_CONSEQUENCE,
  confirmLabel: MONTHLY_CLOSE_LABELS.RECONFIRM_ACTION,
  cancelLabel: MONTHLY_CLOSE_LABELS.CANCEL,
} as const;

/**
 * The empty implementation for stages with no draft state of their own:
 * `buildRequest` submits the stage ID alone, `resetDraft` is a no-op, and the
 * confirm gate and post-confirm effect stay empty. Dispatchable through the
 * same strategy record as every other stage.
 */
export const useNoOpStageControl = (
  stageId: CloseStageId,
  confirmingStageId: string | null,
): CloseStageControl =>
  useConfirmStageControl({
    stageId,
    confirmingStageId,
    buildRequest: () => ({ stageId }),
  });
