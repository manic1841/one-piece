import { PlannedIncomeCategory } from '@/domains/record/types';
import { BaseSchema } from '@/schemas';
import { z } from 'zod';

export const PlannedIncomeAllocationSchema = z.object({
  projectId: z.string(),
  percentage: z.number(),
});
export type PlannedIncomeAllocation = z.infer<typeof PlannedIncomeAllocationSchema>;

export const PlannedIncomeCreateSchema = z.object({
  date: z.date(),
  amount: z.number(),
  category: z.enum(PlannedIncomeCategory),
  description: z.string().optional(),
  allocations: z.array(PlannedIncomeAllocationSchema),
});

export type PlannedIncomeCreate = z.infer<typeof PlannedIncomeCreateSchema>;

export const PlannedIncomeSchema = BaseSchema.extend(PlannedIncomeCreateSchema.shape);

export type PlannedIncome = z.infer<typeof PlannedIncomeSchema>;
