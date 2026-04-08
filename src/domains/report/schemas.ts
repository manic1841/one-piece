import { z } from 'zod';

export const IncomeStatementItemSchema: z.ZodType<IncomeStatementItem> = z.lazy(() =>
  z.object({
    code: z.string(),
    label: z.string(),
    amount: z.number(),
    subItems: z.array(IncomeStatementItemSchema).optional(),
  }),
);

export interface IncomeStatementItem {
  code: string;
  label: string;
  amount: number;
  subItems?: IncomeStatementItem[];
}

export const IncomeStatementDataSchema = z.object({
  yearMonth: z.string(),
  incomeTotal: z.number(),
  expenseTotal: z.number(),
  netIncome: z.number(),
  incomeItems: z.array(IncomeStatementItemSchema),
  expenseItems: z.array(IncomeStatementItemSchema),
});

export type IncomeStatementData = z.infer<typeof IncomeStatementDataSchema>;

export const ReportType = {
  INCOME_STATEMENT: 'INCOME_STATEMENT',
  BALANCE_SHEET: 'BALANCE_SHEET',
  CASH_FLOW: 'CASH_FLOW',
} as const;

export type ReportType = (typeof ReportType)[keyof typeof ReportType];

export const FinancialReportSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  type: z.nativeEnum(ReportType),
  yearMonth: z.string(),
  data: z.any(), // Can be IncomeStatementData or BalanceSheetData
  createdBy: z.string(),
  updatedBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type FinancialReport = z.infer<typeof FinancialReportSchema>;
export type FinancialReportCreate = Omit<FinancialReport, 'id' | 'createdAt' | 'updatedAt'>;

// Balance Sheet
export const BalanceSheetItemSchema = z.object({
  code: z.string(),
  label: z.string(),
  amount: z.number(),
});

export type BalanceSheetItem = z.infer<typeof BalanceSheetItemSchema>;

export const BalanceSheetGroupSchema = z.object({
  label: z.string(),
  total: z.number(),
  items: z.array(BalanceSheetItemSchema),
});

export type BalanceSheetGroup = z.infer<typeof BalanceSheetGroupSchema>;
export const BalanceSheetEquitySchema = z.object({
  total: z.number(),
  groups: z.record(z.string(), BalanceSheetGroupSchema),
});

export type BalanceSheetEquity = z.infer<typeof BalanceSheetEquitySchema>;

export const BalanceSheetDataSchema = z.object({
  yearMonth: z.string(),
  assets: z.object({
    total: z.number(),
    groups: z.record(z.string(), BalanceSheetGroupSchema),
  }),
  liabilities: z.object({
    total: z.number(),
    groups: z.record(z.string(), BalanceSheetGroupSchema),
  }),
  equity: BalanceSheetEquitySchema,
});

export type BalanceSheetData = z.infer<typeof BalanceSheetDataSchema>;

// Cash Flow Statement
export const CashFlowItemSchema = z.object({
  code: z.string(),
  label: z.string(),
  amount: z.number(),
});

export type CashFlowItem = z.infer<typeof CashFlowItemSchema>;

export const CashFlowGroupSchema = z.object({
  label: z.string(),
  total: z.number(),
  inflowItems: z.array(CashFlowItemSchema),
  outflowItems: z.array(CashFlowItemSchema),
});

export type CashFlowGroup = z.infer<typeof CashFlowGroupSchema>;

export const CashFlowDataSchema = z.object({
  yearMonth: z.string(),
  operating: CashFlowGroupSchema,
  investing: CashFlowGroupSchema,
  financing: CashFlowGroupSchema,
  netCashChange: z.number(),
  beginningBalance: z.number(),
  endingBalance: z.number(),
  actualBalance: z.number(),
  adjustment: z.number(),
});

export type CashFlowData = z.infer<typeof CashFlowDataSchema>;
