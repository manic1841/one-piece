// Re-exporting inferred types from schemas to avoid ambiguity or double definitions
import { type z } from 'zod';

import {
  type BalanceSheetDataSchema,
  type BalanceSheetItemSchema,
  type CashFlowDataSchema,
  type FinancialReportSchema,
  type IncomeStatementDataSchema,
  type IncomeStatementItemSchema,
} from './schemas';

export type FinancialReport = z.infer<typeof FinancialReportSchema>;
export type IncomeStatementData = z.infer<typeof IncomeStatementDataSchema>;
export type BalanceSheetData = z.infer<typeof BalanceSheetDataSchema>;
export type CashFlowData = z.infer<typeof CashFlowDataSchema>;
export type IncomeStatementItem = z.infer<typeof IncomeStatementItemSchema>;
export type BalanceSheetItem = z.infer<typeof BalanceSheetItemSchema>;
