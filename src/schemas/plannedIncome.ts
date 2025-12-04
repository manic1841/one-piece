import { z } from 'zod';
import { PlannedIncomeCategory } from '@/domains/transaction/plannedIncomeCategory';

export const PlannedIncomeAllocationSchema = z.object({
  projectId: z.string(),
  percentage: z.number(),
  lastUsedAmount: z.number().optional(),
});
export type PlannedIncomeAllocation = z.infer<typeof PlannedIncomeAllocationSchema>;

export const PlannedIncomeSchema = z.object({
  id: z.string(),
  date: z.date(),
  amount: z.number(),
  category: z.enum(PlannedIncomeCategory),
  description: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string(),
  updatedAt: z.date(),
  allocations: z.array(PlannedIncomeAllocationSchema),
});

export type PlannedIncome = z.infer<typeof PlannedIncomeSchema>;
