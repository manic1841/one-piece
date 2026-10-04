import {
  CLOSE_STAGE_IDS,
  CLOSE_STAGE_IDS_SET,
  type CloseStageId,
  type CloseStageState,
  type FinancialPeriod,
  initialStageStates,
} from './schemas';

export class FinancialPeriodStateError extends Error {
  readonly code:
    | 'PERIOD_NOT_FOUND'
    | 'PERIOD_CLOSED'
    | 'PERIOD_NOT_REOPENABLE'
    | 'STAGE_NOT_FOUND'
    | 'STAGE_NOT_WALK_POSITION'
    | 'STAGE_ALREADY_COMPLETED'
    | 'STAGE_NOT_COMPLETED';

  constructor(code: FinancialPeriodStateError['code'], message: string) {
    super(`[${code}] ${message}`);
    this.code = code;
    this.name = 'FinancialPeriodStateError';
  }
}

/**
 * Walk position (ADR-0070): while paused, the only confirmable stage is the
 * first PENDING stage in CLOSE_STAGE_IDS order; the pause clears only at the
 * walk's terminal confirmation.
 */
export const resolveWalkPosition = (period: FinancialPeriod): CloseStageId | null =>
  CLOSE_STAGE_IDS.find((stageId) => period.stages[stageId]?.status !== 'COMPLETED') ?? null;

const isPausedPeriod = (period: FinancialPeriod): boolean => period.status === 'NEEDS_REVIEW';

const assertWalkPosition = (period: FinancialPeriod, stageId: CloseStageId): void => {
  const walkPosition = resolveWalkPosition(period);
  if (stageId !== walkPosition) {
    throw new FinancialPeriodStateError(
      'STAGE_NOT_WALK_POSITION',
      `while paused, only the walk position (${walkPosition ?? 'none'}) is confirmable, got: ${stageId}`,
    );
  }
};

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
  if (isPausedPeriod(period)) {
    assertWalkPosition(period, stageId);
  }

  const stageState: CloseStageState = { status: 'COMPLETED', confirmedBy, confirmedAt };
  const paused = isPausedPeriod(period);
  const resumes = !paused || period.reviewSourceStageId === stageId;
  return {
    ...period,
    status: resumes ? 'IN_PROGRESS' : period.status,
    reviewSourceStageId: resumes ? null : period.reviewSourceStageId,
    stages:
      paused && resumes
        ? {
            ...period.stages,
            [stageId]: stageState,
            FINANCIAL_REPORTS: { status: 'PENDING' },
            CLOSE_PERIOD: { status: 'PENDING' },
          }
        : { ...period.stages, [stageId]: stageState },
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
  if (isPausedPeriod(period)) {
    assertWalkPosition(period, stageId);
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

/** Re-confirmable stages (ADR-0052/§5): same-key idempotent overwrite is safe.
 * DEBT_REPAYMENT is included: the month's record is keyed by period × account
 * and a re-confirmation replaces it inside one atomic boundary. */
export const isReconfirmableStage = (stageId: CloseStageId): boolean =>
  stageId === 'ACCOUNT_BALANCE' ||
  stageId === 'SECURITIES_TRADE' ||
  stageId === 'PORTFOLIO_CASH_FLOW' ||
  stageId === 'DEBT_REPAYMENT';

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
 * work. A CLOSED period reopens to IN_PROGRESS with Financial Reports and Close
 * Period reset to PENDING so the reports are regenerated and the period is
 * re-closed through normal confirmation; the rest of the completed stages stay
 * as-is. A cascade-demoted one (NEEDS_REVIEW with reviewSourceStageId = null)
 * resets every stage to PENDING and stays NEEDS_REVIEW: the demotion means the
 * later close may rest on pre-correction history, so recovery is a full walk.
 */
export const reopenPeriodInState = (period: FinancialPeriod): FinancialPeriod => {
  if (!isReopenablePeriod(period)) {
    throw new FinancialPeriodStateError(
      'PERIOD_NOT_REOPENABLE',
      'only a closed or cascade-demoted period can be reopened',
    );
  }

  if (isCascadeDemoted(period)) {
    return {
      ...period,
      status: 'NEEDS_REVIEW',
      reviewSourceStageId: null,
      stages: initialStageStates(),
    };
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
 * GO TO reset (ADR-0070): while paused, jumping back to a stage resets that
 * stage and every later stage to PENDING; earlier completed stages stay as-is.
 * The pause and its review source are preserved so recovery stays a walk.
 */
export const resetStagesFromInState = (
  period: FinancialPeriod,
  fromStageId: CloseStageId,
): FinancialPeriod => {
  if (!CLOSE_STAGE_IDS_SET.has(fromStageId)) {
    throw new FinancialPeriodStateError('STAGE_NOT_FOUND', `unknown stage: ${fromStageId}`);
  }

  const fromIndex = CLOSE_STAGE_IDS.indexOf(fromStageId);
  const stages = { ...period.stages };
  for (const stageId of CLOSE_STAGE_IDS.slice(fromIndex)) {
    stages[stageId] = { status: 'PENDING' };
  }
  return { ...period, stages };
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
