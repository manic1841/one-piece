import {
  type StageConfirmPayloads,
  type StageConfirmRequestBody,
} from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import { type CloseStageId } from '@/domains/financial_period/schemas';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { type CloseStageControl } from './closeStageControl';

/**
 * Stages whose confirm carries no payload. The no-op control is only valid for
 * these, so its `{ stageId }` body is exactly the stage's request body.
 */
export type NoPayloadStageId = {
  [K in CloseStageId]: keyof StageConfirmPayloads[K] extends never ? K : never;
}[CloseStageId];

interface UseConfirmStageControlArgs<S extends CloseStageId> {
  stageId: S;
  confirmingStageId: string | null;
  buildRequest: CloseStageControl<S>['buildRequest'];
  /** Ask before submitting (empty-stage warning); false aborts. */
  confirmGate?: () => Promise<boolean>;
  afterConfirm?: CloseStageControl<S>['afterConfirm'];
  /** Reloads the stage's own loaded data after an external change; unset when it loads nothing. */
  refresh?: CloseStageControl<S>['refresh'];
  /** Keep the stage view open after a successful confirm (FINANCIAL_REPORTS). */
  keepsViewOnConfirm?: boolean;
}

/** Shared adapter for stages whose control is a plain confirm with no draft state beyond the per-stage payload. */
export const useConfirmStageControl = <S extends CloseStageId>({
  stageId,
  confirmingStageId,
  buildRequest,
  confirmGate,
  afterConfirm,
  refresh,
  keepsViewOnConfirm,
}: UseConfirmStageControlArgs<S>): CloseStageControl<S> => {
  return {
    stageId,
    confirming: confirmingStageId === stageId,
    buildRequest,
    confirmGate,
    afterConfirm: afterConfirm ?? (() => undefined),
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

/** The empty control for stages with no draft state of their own. */
export const useNoOpStageControl = <S extends NoPayloadStageId>(
  stageId: S,
  confirmingStageId: string | null,
): CloseStageControl<S> =>
  useConfirmStageControl({
    stageId,
    confirmingStageId,
    buildRequest: () => ({ stageId }) as StageConfirmRequestBody<S>,
  });
