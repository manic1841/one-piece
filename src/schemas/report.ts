import { z } from 'zod';
import {
  ReportType,
  IncomeStatementSourceType,
  CashFlowSourceType,
  BalanceSheetSourceType,
} from '@/domains/finance/financeType';

// --- Income Statement Data Structures ---
export const IncomeStatementItemSchema = z.object({
  category: z.string(),
  amount: z.number(),
  subItems: z
    .array(
      z.object({
        name: z.string(),
        amount: z.number(),
        sourceType: z.enum(IncomeStatementSourceType).optional(),
        sourceId: z.string().optional(),
      }),
    )
    .optional(),
});

export type IncomeStatementItem = z.infer<typeof IncomeStatementItemSchema>;

export const IncomeStatementDataSchema = z.object({
  revenue: z.object({
    total: z.number(),
    items: z.array(IncomeStatementItemSchema),
  }),
  expenses: z.object({
    total: z.number(),
    items: z.array(IncomeStatementItemSchema),
  }),
  netIncome: z.number(),
});

export type IncomeStatementData = z.infer<typeof IncomeStatementDataSchema>;

// --- Balance Sheet Data Structures ---
export const BalanceSheetItemSchema = z.object({
  category: z.string(), // e.g., 'Current Assets', 'Fixed Assets'
  amount: z.number(),
  subItems: z
    .array(
      z.object({
        name: z.string(), // Account Name or Project Name
        amount: z.number(),
        sourceType: z.enum(BalanceSheetSourceType).optional(),
        sourceId: z.string().optional(),
      }),
    )
    .optional(),
});

export type BalanceSheetItem = z.infer<typeof BalanceSheetItemSchema>;

export const BalanceSheetDataSchema = z.object({
  assets: z.object({
    total: z.number(),
    items: z.array(BalanceSheetItemSchema),
  }),
  liabilities: z.object({
    total: z.number(),
    items: z.array(BalanceSheetItemSchema),
  }),
  equity: z.object({
    total: z.number(),
    items: z.array(BalanceSheetItemSchema),
  }),
});

export type BalanceSheetData = z.infer<typeof BalanceSheetDataSchema>;

// --- Cash Flow Statement Data Structures ---
export const CashFlowItemSchema = z.object({
  category: z.string(),
  amount: z.number(),
  subItems: z
    .array(
      z.object({
        name: z.string(), // Account Name or Project Name
        amount: z.number(),
        sourceType: z.enum(CashFlowSourceType).optional(),
        sourceId: z.string().optional(),
      }),
    )
    .optional(),
});

export type CashFlowItem = z.infer<typeof CashFlowItemSchema>;

export const CashFlowDataSchema = z.object({
  operating: z.object({
    netAmount: z.number(),
    items: z.array(CashFlowItemSchema),
  }),
  investing: z.object({
    netAmount: z.number(),
    items: z.array(CashFlowItemSchema),
  }),
  financing: z.object({
    netAmount: z.number(),
    items: z.array(CashFlowItemSchema),
  }),
  netChange: z.number(),
  beginningBalance: z.number(),
  endingBalance: z.number(),
});

export type CashFlowData = z.infer<typeof CashFlowDataSchema>;

// --- Main Report Schema ---
export const FinancialReportSchema = z.object({
  id: z.string(), // "{reportType}_{year}-{month}"
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
  updatedAt: z.date(),
});

export type FinancialReport = z.infer<typeof FinancialReportSchema>;
