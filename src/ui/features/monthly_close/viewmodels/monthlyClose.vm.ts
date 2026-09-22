import { z } from 'zod';

import { type CloseStageId, type FinancialPeriod } from '@/domains/financial_period/schemas';

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
