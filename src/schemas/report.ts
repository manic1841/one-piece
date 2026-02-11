import { z } from 'zod';

import { ReportType } from '@/domains/finance/financeType';
import {
  BalanceSheetDataSchema,
  BaseSchema,
  CashFlowDataSchema,
  IncomeStatementDataSchema,
} from '@/schemas';

// --- Main Report Schema ---
export const FinancialReportCreateSchema = z.object({
  type: z.enum(ReportType),
  year: z.number(),
  month: z.number(),
  startDate: z.date(),
  endDate: z.date(),

  reconciled: z.boolean(),
  cached: z.boolean(),

  // Data can be one of the three types
  data: z.union([IncomeStatementDataSchema, BalanceSheetDataSchema, CashFlowDataSchema]),

  generatedAt: z.date(),
  generatedBy: z.string(),
  reconciledAt: z.date().optional(),
  reconciledBy: z.string().optional(),
});

export type FinancialReportCreate = z.infer<typeof FinancialReportCreateSchema>;

export const FinancialReportSchema = BaseSchema.extend(FinancialReportCreateSchema.shape);

export type FinancialReport = z.infer<typeof FinancialReportSchema>;
