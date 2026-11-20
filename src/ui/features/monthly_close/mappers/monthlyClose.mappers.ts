import type { CloseStageId, FinancialPeriod } from '@/domains/financial_period/schemas';
import { isCascadeDemoted } from '@/domains/financial_period/stateMachine';
import {
  CLOSE_STAGE_LABELS,
  CLOSE_STAGE_ORDER,
  MONTHLY_CLOSE_LABELS,
  PERIOD_STATUS_TEXT,
} from '@/ui/constants/monthlyClose';

import type { CloseStageItemVM, MonthlyClosePageVM } from '../viewmodels/monthlyClose.vm';

/** A `YYYY-MM` period as its display title, e.g. "2026 年 9 月". */
export const formatYearMonthTitle = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-');
  return `${year} 年 ${Number(month)} 月`;
};

export const mapPeriodToPageVM = (period: FinancialPeriod): MonthlyClosePageVM => {
  const confirmedAtOf = (stageId: CloseStageId): Date | null => {
    const at = period.stages[stageId]?.confirmedAt;
    return at instanceof Date ? at : null;
  };

  const stages: CloseStageItemVM[] = CLOSE_STAGE_ORDER.map((stageId, index) => {
    const stageState = period.stages[stageId];
    const isCompleted = stageState?.status === 'COMPLETED';
    // Derived staleness: a completed stage confirmed before a later completed
    // stage needs reconfirmation after upstream data changes. No stored state.
    const stageConfirmedAt = confirmedAtOf(stageId);
    const isStale =
      isCompleted &&
      stageConfirmedAt !== null &&
      CLOSE_STAGE_ORDER.slice(index + 1).some((laterId) => {
        const laterAt = confirmedAtOf(laterId);
        return laterAt !== null && laterAt < stageConfirmedAt;
      });
    return {
      stageId,
      label: CLOSE_STAGE_LABELS[stageId],
      status: isCompleted ? 'COMPLETED' : 'PENDING',
      isCompleted,
      isReviewSource: period.reviewSourceStageId === stageId,
      isStale,
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
    periodTitle: formatYearMonthTitle(period.yearMonth),
    status: period.status,
    statusText: PERIOD_STATUS_TEXT[period.status] ?? period.status,
    isPaused: period.status === 'NEEDS_REVIEW',
    isClosed: period.status === 'CLOSED',
    isCascadeDemoted: isCascadeDemoted(period),
    isActive: period.status === 'IN_PROGRESS' || period.status === 'NEEDS_REVIEW',
    reviewSourceStageId: period.reviewSourceStageId ?? null,
    reviewSourceLabel: period.reviewSourceStageId
      ? (CLOSE_STAGE_LABELS[period.reviewSourceStageId as keyof typeof CLOSE_STAGE_LABELS] ??
        period.reviewSourceStageId)
      : null,
    stages,
    completedCount,
    totalCount: CLOSE_STAGE_ORDER.length,
  };
};
