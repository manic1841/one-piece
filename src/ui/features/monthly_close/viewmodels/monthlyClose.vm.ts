import { z } from 'zod';

import { type CloseStageId, type FinancialPeriod } from '@/domains/financial_period/schemas';
import { CLOSE_STAGE_ORDER } from '@/ui/constants/monthlyClose';

export type { CloseStageId, FinancialPeriod };

export type {
  DebtRepaymentInput,
  FinancingInput,
  SecuritiesTradeInput,
} from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';

export { isCascadeDemoted, isReopenablePeriod } from '@/domains/financial_period/stateMachine';

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
  status: FinancialPeriod['status'];
  statusText: string;
  isPaused: boolean;
  isClosed: boolean;
  isCascadeDemoted: boolean;
  isActive: boolean;
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
  viewingStageId: CloseStageId | null;
  currentStageId: CloseStageId | null;
}

const padStep = (value: number): string => value.toString().padStart(2, '0');

/**
 * The stage the workspace should show: the viewed or walk-position stage.
 * A closed period has no walk position, so it renders the read-only Close
 * Period summary unless the user is reviewing another stage.
 */
export const resolveDisplayedStageId = ({
  isClosed,
  viewingStageId,
  currentStageId,
}: DisplayedStageTarget): CloseStageId | null => {
  if (isClosed) return viewingStageId ?? 'CLOSE_PERIOD';
  return viewingStageId ?? currentStageId;
};

/**
 * The stage that follows `stageId` in walk order, or null at the end. Lets the
 * page advance from a stage's Continue without naming the target: the order
 * stays in this one module, so no stage ID leaks into the page hook.
 */
export const resolveNextStageId = (stageId: CloseStageId | null): CloseStageId | null => {
  if (!stageId) return null;
  const index = CLOSE_STAGE_ORDER.indexOf(stageId);
  if (index < 0 || index >= CLOSE_STAGE_ORDER.length - 1) return null;
  return CLOSE_STAGE_ORDER[index + 1];
};

export const resolvePositionText = (
  stages: { stageId: CloseStageId }[],
  currentStageId: CloseStageId | null,
  isClosed: boolean,
  totalCount: number,
  displayedStageId: CloseStageId | null = null,
): string => {
  const position = isClosed
    ? displayedStageId === null
      ? totalCount
      : stages.findIndex((stage) => stage.stageId === displayedStageId) + 1
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

/** GO TO while paused resets the target stage and everything after it (ADR-0070). */
export const resolveGoToResetRange = (
  stages: { stageId: CloseStageId }[],
  targetStageId: CloseStageId,
  totalCount: number,
): string => {
  const index = stages.findIndex((stage) => stage.stageId === targetStageId);
  const fromStep = index === -1 ? 1 : index + 1;
  return `${padStep(fromStep)}-${padStep(totalCount)}`;
};
