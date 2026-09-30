import type { MonthlyCloseConfirmRequest } from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import type { CloseStageId } from '@/domains/financial_period/schemas';

/**
 * The stage controller contract every close stage satisfies — the strategy
 * interface the page dispatches on. A stage owns its prefill and draft state;
 * the page injects the shared submit (assemble request → confirmStage →
 * refresh evidence) and navigation callbacks. Stages with no draft or no
 * post-confirm effect return empty implementations from
 * `useConfirmStageControl`, so orchestration reads the contract instead of
 * branching on stage IDs.
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
  /** Ask before submitting (empty-stage warning); false aborts. */
  confirmGate?: () => Promise<boolean>;
  /** Post-confirm side effects (prefill refresh keys, navigation resets). */
  afterConfirm: () => void;
  /**
   * Month switch retires the stage draft (back to `[]` / `{}` / empty rows);
   * a no-op for stages without one. The page iterates the strategy record on
   * month switch, so a new draft-bearing stage registers its own reset.
   */
  resetDraft: () => void;
  /**
   * Reloads the stage's own loaded data after an external change (period
   * start/reopen/reset, or a confirm). Mirrors `resetDraft`: the page iterates
   * the strategy record and calls it, so a stage that loads data opts in and
   * the page never learns which stage owns what. Optional; stages that load
   * nothing leave it unset.
   */
  refresh?: () => Promise<void>;
  /** Keep the stage view open after a successful confirm (FINANCIAL_REPORTS). */
  keepsViewOnConfirm?: boolean;
}
