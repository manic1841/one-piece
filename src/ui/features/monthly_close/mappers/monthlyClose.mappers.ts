import {
  CLOSE_STAGE_LABELS,
  CLOSE_STAGE_ORDER,
  MONTHLY_CLOSE_LABELS,
} from '@/ui/constants/monthlyClose';
import type {
  CloseStageEvidence,
  CloseStageItemVM,
  MonthlyClosePageVM,
} from '../viewmodels/monthlyClose.vm';
import type { FinancialPeriod } from '@/domains/financial_period/schemas';
import type { CompletenessActivity } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';

const STATUS_TEXT_MAP: Record<string, string> = {
  OPEN: MONTHLY_CLOSE_LABELS.OPEN,
  IN_PROGRESS: MONTHLY_CLOSE_LABELS.IN_PROGRESS,
  NEEDS_REVIEW: MONTHLY_CLOSE_LABELS.NEEDS_REVIEW,
  CLOSED: MONTHLY_CLOSE_LABELS.CLOSED,
};

export const mapPeriodToPageVM = (
  period: FinancialPeriod | null,
  yearMonth: string,
): MonthlyClosePageVM => {
  if (!period) {
    return {
      periodLabel: MONTHLY_CLOSE_LABELS.PERIOD_LABEL,
      periodText: yearMonth,
      status: 'NONE',
      statusText: MONTHLY_CLOSE_LABELS.OPEN,
      isPaused: false,
      isClosed: false,
      isActive: false,
      isStarted: false,
      reviewSourceStageId: null,
      reviewSourceLabel: null,
      stages: [],
      completedCount: 0,
      totalCount: CLOSE_STAGE_ORDER.length,
    };
  }

  const stages: CloseStageItemVM[] = CLOSE_STAGE_ORDER.map((stageId) => {
    const stageState = period.stages[stageId];
    const isCompleted = stageState?.status === 'COMPLETED';
    return {
      stageId,
      label: CLOSE_STAGE_LABELS[stageId],
      status: isCompleted ? 'COMPLETED' : 'PENDING',
      isCompleted,
      isReviewSource: period.reviewSourceStageId === stageId,
      confirmedByText: stageState?.confirmedBy ?? null,
      confirmedAtText:
        stageState?.confirmedAt instanceof Date
          ? stageState.confirmedAt.toISOString().slice(0, 16).replace('T', ' ')
          : null,
    };
  });

  const completedCount = stages.filter((stage) => stage.isCompleted).length;

  return {
    periodLabel: MONTHLY_CLOSE_LABELS.PERIOD_LABEL,
    periodText: period.yearMonth,
    status: period.status,
    statusText: STATUS_TEXT_MAP[period.status] ?? period.status,
    isPaused: period.status === 'NEEDS_REVIEW',
    isClosed: period.status === 'CLOSED',
    isActive: period.status === 'IN_PROGRESS' || period.status === 'NEEDS_REVIEW',
    isStarted: true,
    reviewSourceStageId: period.reviewSourceStageId ?? null,
    reviewSourceLabel: period.reviewSourceStageId
      ? CLOSE_STAGE_LABELS[period.reviewSourceStageId as keyof typeof CLOSE_STAGE_LABELS] ??
        period.reviewSourceStageId
      : null,
    stages,
    completedCount,
    totalCount: CLOSE_STAGE_ORDER.length,
  };
};

export const mapAnomaliesToEvidence = (
  anomalies: CompletenessActivity[],
): CloseStageEvidence => ({
  kind: 'COMPLETENESS_ANOMALIES',
  zeroActivityNames: anomalies.map((activity) => activity.name),
  cashFlowAdjustments: 0,
  reportsPersisted: null,
});

export const mapAdjustmentCountToEvidence = (
  adjustments: number,
): CloseStageEvidence => ({
  kind: 'CASH_FLOW_ADJUSTMENTS',
  zeroActivityNames: [],
  cashFlowAdjustments: adjustments,
  reportsPersisted: null,
});

export const mapPersistenceToEvidence = (
  reportsPersisted: boolean,
): CloseStageEvidence => ({
  kind: 'REPORT_PERSISTENCE',
  zeroActivityNames: [],
  cashFlowAdjustments: 0,
  reportsPersisted,
});

export const NO_EVIDENCE: CloseStageEvidence = {
  kind: 'NONE',
  zeroActivityNames: [],
  cashFlowAdjustments: 0,
  reportsPersisted: null,
};
