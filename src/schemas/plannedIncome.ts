import { z } from 'zod';
import { TimestampSchema } from './helper';
import { PlannedIncomeCategory } from '@/domains/transaction/plannedIncomeCategory';

export const PlannedIncomeAllocationSchema = z.object({
  projectId: z.string(),
  percentage: z.number(),
  lastUsedAmount: z.number().optional(),
});
export type PlannedIncomeAllocation = z.infer<typeof PlannedIncomeAllocationSchema>;

export const PlannedIncomeUserSettingsSchema = z.object({
  modifiedAt: TimestampSchema.optional(),
  adjustedAllocations: z
    .array(
      z.object({
        projectId: z.string(),
        percentage: z.number(),
      }),
    )
    .optional(),
});
export type PlannedIncomeUserSettings = z.infer<typeof PlannedIncomeUserSettingsSchema>;

export const PlannedIncomeSchema = z.object({
  id: z.string(),
  date: z.union([TimestampSchema, z.instanceof(Date)]),
  amount: z.number(),
  category: z.enum(PlannedIncomeCategory),
  description: z.string().optional(),
  createdBy: z.string(),
  createdAt: TimestampSchema,
  allocations: z.array(PlannedIncomeAllocationSchema),
  userSettings: PlannedIncomeUserSettingsSchema.optional(),
});

export type PlannedIncome = z.infer<typeof PlannedIncomeSchema>;
