import type {
  MonthlyCloseConfirmRequest,
  MonthlyCloseConfirmResult,
} from '@/application/monthly_close/use_cases/monthlyCloseRequests';
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
  /**
   * Post-confirm side effects, given the confirmation's result: adopt the
   * stage's authoritative rows and/or reset navigation. Called only after a
   * successful confirm (a null result writes nothing and skips it).
   */
  afterConfirm: (result: MonthlyCloseConfirmResult) => void;
  /**
   * Reloads the stage's own loaded data after an external change (period
   * start/reopen/reset, or a confirm). Mirrors the optionality of a load: the
   * page iterates the strategy record and calls it, so a stage that loads data
   * opts in and the page never learns which stage owns what. Optional; stages
   * that load nothing leave it unset.
   */
  refresh?: () => Promise<void>;
  /** Keep the stage view open after a successful confirm (FINANCIAL_REPORTS). */
  keepsViewOnConfirm?: boolean;
}
