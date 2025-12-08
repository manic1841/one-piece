import { CashFlowSourceType } from '@/domains/finance/financeType';
import { z } from 'zod';

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
