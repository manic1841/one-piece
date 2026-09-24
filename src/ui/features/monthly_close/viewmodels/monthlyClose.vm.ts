import { z } from 'zod';

import { type CloseStageId, type FinancialPeriod } from '@/domains/financial_period/schemas';

export type { CloseStageId };

export type {
  DebtRepaymentInput,
  FinancingInput,
  SecuritiesTradeInput,
} from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';

export interface CloseStageEvidence {
  kind: 'TRANSACTION_VALIDATION' | 'COMPLETENESS_ANOMALIES' | 'CASH_FLOW_ADJUSTMENTS' | 'REPORT_PERSISTENCE' | 'NONE';
  transactionIssues: { transactionId: string; description: string; reason: string }[];
  zeroActivityNames: string[];
  cashFlowAdjustments: number;
  reportsPersisted: boolean | null;
}

export interface CloseStageItemVM {
  stageId: CloseStageId;
  label: string;
  status: 'PENDING' | 'COMPLETED';
  isCompleted: boolean;
  isReviewSource: boolean;
  isStale: boolean;
  confirmedByText: string | null;
  confirmedAtText: string | null;
}

export interface MonthlyClosePageVM {
  periodLabel: string;
  periodText: string;
  status: FinancialPeriod['status'] | 'NONE';
  statusText: string;
  isPaused: boolean;
  isClosed: boolean;
  isActive: boolean;
  isStarted: boolean;
  reviewSourceStageId: CloseStageId | null;
  reviewSourceLabel: string | null;
  stages: CloseStageItemVM[];
  completedCount: number;
  totalCount: number;
}

export const monthlyCloseInputSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

export type MonthlyCloseInput = z.infer<typeof monthlyCloseInputSchema>;

export interface DisplayedStageTarget {
  isClosed: boolean;
  isPaused: boolean;
  reviewSourceStageId: CloseStageId | null;
  viewingStageId: CloseStageId | null;
  currentStageId: CloseStageId | null;
}

const padStep = (value: number): string => value.toString().padStart(2, '0');

/** The stage the workspace should show: the reviewed one when paused, else the viewed or current one. */
export const resolveDisplayedStageId = ({
  isClosed,
  isPaused,
  reviewSourceStageId,
  viewingStageId,
  currentStageId,
}: DisplayedStageTarget): CloseStageId | null => {
  if (isClosed) return null;
  if (isPaused) return reviewSourceStageId ?? currentStageId;
  return viewingStageId ?? currentStageId;
};

export const resolvePositionText = (
  stages: { stageId: CloseStageId }[],
  currentStageId: CloseStageId | null,
  isClosed: boolean,
  totalCount: number,
): string => {
  const position = isClosed
    ? totalCount
    : stages.findIndex((stage) => stage.stageId === currentStageId) + 1;
  return `${padStep(Math.max(position, 1))} / ${padStep(totalCount)}`;
};

export const resolveStepText = (
  stages: { stageId: CloseStageId; label: string }[],
  displayedStageId: CloseStageId | null,
): string | null => {
  const index = stages.findIndex((stage) => stage.stageId === displayedStageId);
  if (index === -1) return null;
  return `${padStep(index + 1)} ${stages[index].label}`;
};
