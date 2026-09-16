import {
  type CloseStageId,
  type CloseStageState,
  type FinancialPeriod,
  type FinancialPeriodStatus,
  CLOSE_STAGE_IDS_SET,
} from './schemas';

export class FinancialPeriodStateError extends Error {
  readonly code:
    | 'PERIOD_NOT_FOUND'
    | 'PERIOD_CLOSED'
    | 'STAGE_NOT_FOUND'
    | 'STAGE_ALREADY_COMPLETED'
    | 'STAGE_NOT_COMPLETED';

  constructor(code: FinancialPeriodStateError['code'], message: string) {
    super(`[${code}] ${message}`);
    this.code = code;
    this.name = 'FinancialPeriodStateError';
  }
}

export const resolvePeriodStatus = (
  existing: FinancialPeriod | null,
): FinancialPeriodStatus => existing?.status ?? 'OPEN';

export const confirmStageInState = (
  period: FinancialPeriod,
  stageId: CloseStageId,
  confirmedBy: string,
  confirmedAt: Date,
): FinancialPeriod => {
  if (period.status === 'CLOSED') {
    throw new FinancialPeriodStateError('PERIOD_CLOSED', 'cannot confirm a stage on a closed period');
  }
  if (!CLOSE_STAGE_IDS_SET.has(stageId)) {
    throw new FinancialPeriodStateError('STAGE_NOT_FOUND', `unknown stage: ${stageId}`);
  }
  const current = period.stages[stageId];
  if (current?.status === 'COMPLETED') {
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
