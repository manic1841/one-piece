import type { MonthlyCloseConfirmRequest } from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import type { CloseStageId } from '@/domains/financial_period/schemas';

/**
 * The stage controller contract every close stage satisfies. A stage owns its
 * prefill and draft state; the page injects the shared submit (assemble request
 * → confirmStage → refresh evidence) and navigation callbacks.
 */
export interface CloseStageControl {
  stageId: CloseStageId;
  /** Which stage's confirm button shows the loading state. */
  confirming: boolean;
  /** The per-stage payload the stage assembles at confirm time. */
  buildRequest: () => Omit<
    MonthlyCloseConfirmRequest,
    'householdId' | 'yearMonth' | 'userEmail' | 'auth'
  >;
  /** Pre-confirm gate: return true when the stage must not submit. */
  shouldBlock: () => boolean;
  /** Ask before submitting (empty-stage warning); false aborts. */
  confirmGate?: () => Promise<boolean>;
  /** Post-confirm side effects (prefill refresh keys, navigation resets). */
  afterConfirm: () => void;
}
