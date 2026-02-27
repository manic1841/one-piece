import { z } from 'zod';

import { CashFlowSourceType } from '@/domains/finance/financeType';

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

export const CashFlowSectionSchema = z.object({
  income: z.array(CashFlowItemSchema),
  expense: z.array(CashFlowItemSchema),
  netAmount: z.number(),
  items: z.array(CashFlowItemSchema),
});

export type CashFlowSection = z.infer<typeof CashFlowSectionSchema>;

export const CashFlowDataSchema = z.object({
  operating: CashFlowSectionSchema,
  investing: CashFlowSectionSchema,
  financing: CashFlowSectionSchema,
  netChange: z.number(),
  beginningBalance: z.number(),
  endingBalance: z.number(),
});

export type CashFlowData = z.infer<typeof CashFlowDataSchema>;
