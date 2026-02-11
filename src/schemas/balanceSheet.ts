import { z } from 'zod';

import { BalanceSheetSourceType } from '@/domains/finance/financeType';

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
