import { z } from 'zod';
import { TimestampSchema } from './helper';

/**
 * Cash flow item (inflow or outflow)
 */
export const CashFlowItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(), // Positive for inflow, negative for outflow
  category: z.string().optional(),
  order: z.number().int().optional(),
});

export type CashFlowItem = z.infer<typeof CashFlowItemSchema>;

/**
 * Cash flow section (Operating, Investing, Financing)
 */
export const CashFlowSectionSchema = z.object({
  items: z.array(CashFlowItemSchema),
  netAmount: z.number(),
});

export type CashFlowSection = z.infer<typeof CashFlowSectionSchema>;

/**
 * Complete Cash Flow Statement
 */
export const CashFlowStatementSchema = z.object({
  id: z.string(),
  startDate: z.union([TimestampSchema, z.instanceof(Date)]),
  endDate: z.union([TimestampSchema, z.instanceof(Date)]),
  year: z.number().int(),
  month: z.number().int().optional(),
  quarter: z.number().int().optional(),

  operating: CashFlowSectionSchema, // 營業活動
  investing: CashFlowSectionSchema, // 投資活動
  financing: CashFlowSectionSchema, // 融資活動

  netChange: z.number(), // 現金淨增減
  beginningBalance: z.number(), // 期初現金
  endingBalance: z.number(), // 期末現金

  createdAt: TimestampSchema,
  createdBy: z.string(),
});

export type CashFlowStatement = z.infer<typeof CashFlowStatementSchema>;
