import {
  CLOSE_STAGE_IDS_SET,
  type CloseStageId,
  type CloseStageState,
  type FinancialPeriod,
  type FinancialPeriodStatus,
} from './schemas';

export class FinancialPeriodStateError extends Error {
  readonly code:
    | 'PERIOD_NOT_FOUND'
    | 'PERIOD_CLOSED'
    | 'PERIOD_NOT_REOPENABLE'
    | 'STAGE_NOT_FOUND'
    | 'STAGE_ALREADY_COMPLETED'
    | 'STAGE_NOT_COMPLETED';

  constructor(code: FinancialPeriodStateError['code'], message: string) {
    super(`[${code}] ${message}`);
    this.code = code;
    this.name = 'FinancialPeriodStateError';
  }
}

export const resolvePeriodStatus = (existing: FinancialPeriod | null): FinancialPeriodStatus =>
  existing?.status ?? 'OPEN';

export const confirmStageInState = (
  period: FinancialPeriod,
  stageId: CloseStageId,
  confirmedBy: string,
  confirmedAt: Date,
): FinancialPeriod => {
  if (period.status === 'CLOSED') {
    throw new FinancialPeriodStateError(
      'PERIOD_CLOSED',
      'cannot confirm a stage on a closed period',
    );
  }
  if (!CLOSE_STAGE_IDS_SET.has(stageId)) {
    throw new FinancialPeriodStateError('STAGE_NOT_FOUND', `unknown stage: ${stageId}`);
  }
  const current = period.stages[stageId];
  if (current?.status === 'COMPLETED' && !isReconfirmableStage(stageId)) {
    throw new FinancialPeriodStateError('STAGE_ALREADY_COMPLETED', `stage completed: ${stageId}`);
  }

  const stageState: CloseStageState = { status: 'COMPLETED', confirmedBy, confirmedAt };
  return {
    ...period,
    status: 'IN_PROGRESS',
    reviewSourceStageId: null,
    stages: { ...period.stages, [stageId]: stageState },
  };
};

export const reconfirmStageInState = (
  period: FinancialPeriod,
  stageId: CloseStageId,
  confirmedBy: string,
  confirmedAt: Date,
): FinancialPeriod => {
  if (period.status === 'CLOSED') {
    throw new FinancialPeriodStateError(
      'PERIOD_CLOSED',
      'cannot confirm a stage on a closed period',
    );
  }
  if (!CLOSE_STAGE_IDS_SET.has(stageId)) {
    throw new FinancialPeriodStateError('STAGE_NOT_FOUND', `unknown stage: ${stageId}`);
  }
  const stageState: CloseStageState = { status: 'COMPLETED', confirmedBy, confirmedAt };
  return {
    ...period,
    stages: { ...period.stages, [stageId]: stageState },
  };
};

export const markNeedsReviewInState = (
  period: FinancialPeriod,
  stageId: CloseStageId,
): FinancialPeriod => {
  if (period.status === 'CLOSED') {
    throw new FinancialPeriodStateError('PERIOD_CLOSED', 'closed period cannot need review');
  }
  if (!CLOSE_STAGE_IDS_SET.has(stageId)) {
    throw new FinancialPeriodStateError('STAGE_NOT_FOUND', `unknown stage: ${stageId}`);
  }
  return {
    ...period,
    status: 'NEEDS_REVIEW',
    reviewSourceStageId: stageId,
  };
};

export const isStageCompleted = (period: FinancialPeriod, stageId: CloseStageId): boolean =>
  period.stages[stageId]?.status === 'COMPLETED';

/** Re-confirmable stages (ADR-0052/§5): same-key idempotent overwrite is safe. */
export const isReconfirmableStage = (stageId: CloseStageId): boolean =>
  stageId === 'ACCOUNT_BALANCE' ||
  stageId === 'SECURITIES_TRADE' ||
  stageId === 'PORTFOLIO_CASH_FLOW';

export const closePeriodInState = (
  period: FinancialPeriod,
  closedBy: string,
  closedAt: Date,
): FinancialPeriod => {
  if (period.status === 'CLOSED') {
    throw new FinancialPeriodStateError('PERIOD_CLOSED', 'period is already closed');
  }
  if (!isStageCompleted(period, 'CLOSE_PERIOD')) {
    throw new FinancialPeriodStateError(
      'STAGE_NOT_COMPLETED',
      'Close Period stage must be confirmed before closing',
    );
  }

  return {
    ...period,
    status: 'CLOSED',
    reviewSourceStageId: null,
    stages: {
      ...period.stages,
      CLOSE_PERIOD: {
        status: 'COMPLETED',
        confirmedBy: closedBy,
        confirmedAt: closedAt,
      },
    },
  };
};

export const completedStageCount = (period: FinancialPeriod): number =>
  Object.values(period.stages).filter((stage) => stage.status === 'COMPLETED').length;

/** A cascade pause (ADR-0066): NEEDS_REVIEW with no review source stage. */
export const isCascadeDemoted = (period: FinancialPeriod): boolean =>
  period.status === 'NEEDS_REVIEW' && period.reviewSourceStageId === null;

/** Reopenable (ADR-0066): a closed period or a cascade-demoted one. */
export const isReopenablePeriod = (period: FinancialPeriod): boolean =>
  period.status === 'CLOSED' || isCascadeDemoted(period);

/**
 * Reopen (ADR-0066): withdraw the finalize decision while keeping earlier stage
 * work. Accepts a CLOSED period or a cascade-demoted one (NEEDS_REVIEW with
 * reviewSourceStageId = null); both reopen to IN_PROGRESS with Financial
 * Reports and Close Period reset to PENDING so the reports are regenerated
 * and the period is re-closed through normal confirmation; the rest of the
 * completed stages stay as-is.
 */
export const reopenPeriodInState = (period: FinancialPeriod): FinancialPeriod => {
  if (!isReopenablePeriod(period)) {
    throw new FinancialPeriodStateError(
      'PERIOD_NOT_REOPENABLE',
      'only a closed or cascade-demoted period can be reopened',
    );
  }

  return {
    ...period,
    status: 'IN_PROGRESS',
    reviewSourceStageId: null,
    stages: {
      ...period.stages,
      FINANCIAL_REPORTS: { status: 'PENDING' },
      CLOSE_PERIOD: { status: 'PENDING' },
    },
  };
};

/**
 * Reopen cascade (ADR-0066): a later closed period may rest on pre-correction
 * history, so it is demoted to NEEDS_REVIEW with reviewSourceStageId = null —
 * the marker distinguishing a cascade from a Completeness Check pause. It does
 * not auto-restore when the earlier period is re-closed; recovery is manual.
 */
export const supersedeClosedPeriodInState = (period: FinancialPeriod): FinancialPeriod => {
  if (period.status !== 'CLOSED') {
    throw new FinancialPeriodStateError(
      'PERIOD_NOT_REOPENABLE',
      'only a closed period can be superseded',
    );
  }

  return {
    ...period,
    status: 'NEEDS_REVIEW',
    reviewSourceStageId: null,
  };
};
