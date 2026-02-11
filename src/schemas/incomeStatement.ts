import { z } from 'zod';

import { IncomeStatementSourceType } from '@/domains/finance/financeType';

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
