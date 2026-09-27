import { z } from 'zod';

import { BaseSchema } from '@/shared/schemas/base';

// [DOMAIN ENTITY]
// FinancialPeriod is the minimal persisted workflow-state record for one
// closing period (ADR-0050). Stages follow the M1 stage model (ADR-0052);
// the listed order is UI guidance only, the system does not enforce it.
// Path: households/{householdId}/financialPeriods/{docId}, docId = yearMonth.
// No record means the period has not started closing (treated as OPEN).

export const CLOSE_STAGE_IDS = [
  'ACCOUNT_BALANCE',
  'TRANSACTION_VALIDATION',
  'SECURITIES_TRADE',
  'PORTFOLIO_CASH_FLOW',
  'PROJECT_SETTLEMENT',
  'DEBT_REPAYMENT',
  'COMPLETENESS_CHECK',
  'FINANCIAL_REPORTS',
  'CLOSE_PERIOD',
] as const;
export type CloseStageId = (typeof CLOSE_STAGE_IDS)[number];

export const CLOSE_STAGE_IDS_SET: ReadonlySet<string> = new Set(CLOSE_STAGE_IDS);

export const FinancialPeriodStatus = z.enum(['OPEN', 'IN_PROGRESS', 'NEEDS_REVIEW', 'CLOSED']);
export type FinancialPeriodStatus = z.infer<typeof FinancialPeriodStatus>;

export const CloseStageStateSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED']),
  confirmedAt: z.date().optional(),
  confirmedBy: z.string().optional(),
});
export type CloseStageState = z.infer<typeof CloseStageStateSchema>;

export const FinancialPeriodCreateSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  status: FinancialPeriodStatus,
  stages: z
    .record(z.string(), CloseStageStateSchema)
    .refine((stages) => Object.keys(stages).every((stageId) => CLOSE_STAGE_IDS_SET.has(stageId)), {
      message: 'stages contain unknown stage IDs',
    }),
  reviewSourceStageId: z.enum(CLOSE_STAGE_IDS).nullable().optional(),
});
export type FinancialPeriodCreate = z.infer<typeof FinancialPeriodCreateSchema>;

export const FinancialPeriodSchema = BaseSchema.extend(FinancialPeriodCreateSchema.shape);
export type FinancialPeriod = z.infer<typeof FinancialPeriodSchema>;

export const buildFinancialPeriodDocId = (yearMonth: string): string => yearMonth;

export const initialStageStates = (): Record<string, CloseStageState> =>
  Object.fromEntries(CLOSE_STAGE_IDS.map((stageId) => [stageId, { status: 'PENDING' as const }]));
