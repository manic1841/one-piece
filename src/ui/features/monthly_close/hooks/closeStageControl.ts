import type {
  MonthlyCloseConfirmRequest,
  StageConfirmData,
} from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import type { CloseStageId } from '@/domains/financial_period/schemas';

/** The stage controller contract every close stage satisfies (the strategy interface the page dispatches on). */
export interface CloseStageControl<S extends CloseStageId = CloseStageId> {
  stageId: S;
  /** Which stage's confirm button shows the loading state. */
  confirming: boolean;
  /** The per-stage payload the stage assembles at confirm time. */
  buildRequest: () => Omit<
    MonthlyCloseConfirmRequest,
    'householdId' | 'yearMonth' | 'userEmail' | 'auth'
  >;
  /** Ask before submitting (empty-stage warning); false aborts. */
  confirmGate?: () => Promise<boolean>;
  /** Post-confirm side effects, given this stage's own authoritative slice. */
  afterConfirm: (data: StageConfirmData<S>) => void;
  /** Reloads the stage's own loaded data after an external change; unset when the stage loads nothing. */
  refresh?: () => Promise<void>;
  /** Keep the stage view open after a successful confirm (FINANCIAL_REPORTS). */
  keepsViewOnConfirm?: boolean;
}
