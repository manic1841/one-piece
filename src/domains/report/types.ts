// Re-exporting inferred types from schemas to avoid ambiguity or double definitions
import { type z } from 'zod';
import {
  type FinancialReportSchema,
  type IncomeStatementDataSchema,
  type BalanceSheetDataSchema,
  type CashFlowDataSchema,
  type IncomeStatementItemSchema,
  type BalanceSheetItemSchema,
} from './schemas';

export type FinancialReport = z.infer<typeof FinancialReportSchema>;
export type IncomeStatementData = z.infer<typeof IncomeStatementDataSchema>;
export type BalanceSheetData = z.infer<typeof BalanceSheetDataSchema>;
export type CashFlowData = z.infer<typeof CashFlowDataSchema>;
export type IncomeStatementItem = z.infer<typeof IncomeStatementItemSchema>;
export type BalanceSheetItem = z.infer<typeof BalanceSheetItemSchema>;

export const ReportType = {
  INCOME_STATEMENT: 'income_statement',
  BALANCE_SHEET: 'balance_sheet',
  CASH_FLOW: 'cash_flow',
} as const;

export type ReportType = (typeof ReportType)[keyof typeof ReportType];

export const CashFlowSourceType = {
  SYSTEM: 'SYSTEM',
  MANUAL: 'MANUAL',
} as const;

export type CashFlowSourceType = (typeof CashFlowSourceType)[keyof typeof CashFlowSourceType];

// trend.ts could be separate, but for now putting here if it's small
export interface TrendDataPoint {
  year: number;
  month: number;
  income: number | null;
  incomeByCategory: Record<string, number>;
  expense: number | null;
  totalAssets: number | null;
  investmentGain: number | null;
}
