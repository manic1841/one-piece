import { z } from 'zod';
import { TimestampSchema } from './helper';
import { IncomeStatementSourceType } from '@/domains/finance/financeType';
/**
 * Income statement item (single income or expense item)
 */
export const IncomeStatementItemSchema = z.object({
  id: z.string(),
  // For income: 'salary', 'bonus', 'other', 'extra'
  // For expense: '生活', '居住', etc.
  category: z.string(),
  subcategory: z.string().optional(), // Project name or specific detail
  amount: z.number(),
  order: z.number().int().optional(),
  // Reference to source (transaction ID, project ID, etc.)
  sourceType: z.enum(IncomeStatementSourceType).optional(),
  sourceId: z.string().optional(),
});

export type IncomeStatementItem = z.infer<typeof IncomeStatementItemSchema>;

/**
 * Category with items and subtotal
 */
export const CategoryGroupSchema = z.object({
  category: z.string(),
  items: z.array(IncomeStatementItemSchema),
  subtotal: z.number(),
  order: z.number().int().optional(),
});

export type CategoryGroup = z.infer<typeof CategoryGroupSchema>;

/**
 * Income section of statement
 */
export const IncomeSectionSchema = z.object({
  categories: z.array(CategoryGroupSchema),
  total: z.number(),
});

export type IncomeSection = z.infer<typeof IncomeSectionSchema>;

/**
 * Expense section of statement
 */
export const ExpenseSectionSchema = z.object({
  categories: z.array(CategoryGroupSchema),
  total: z.number(),
});

export type ExpenseSection = z.infer<typeof ExpenseSectionSchema>;

/**
 * Complete Income Statement
 */
export const IncomeStatementSchema = z.object({
  id: z.string(),
  startDate: z.union([TimestampSchema, z.instanceof(Date)]),
  endDate: z.union([TimestampSchema, z.instanceof(Date)]),
  year: z.number().int(),
  month: z.number().int().optional(), // For monthly reports
  quarter: z.number().int().optional(), // For quarterly reports

  income: IncomeSectionSchema,
  expense: ExpenseSectionSchema,

  // Net income (profit/loss)
  netIncome: z.number(),

  createdAt: TimestampSchema,
  createdBy: z.string(),
});

export type IncomeStatement = z.infer<typeof IncomeStatementSchema>;

/**
 * Aggregated data for a period
 */
export interface PeriodAggregation {
  startDate: Date;
  endDate: Date;
  income: Map<string, number>;
  expense: Map<string, number>;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
}
