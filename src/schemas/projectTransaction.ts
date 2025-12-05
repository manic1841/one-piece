import { z } from 'zod';
import { ProjectTransactionCategory } from '@/domains/record/types';

// ProjectTransaction Schema
export const ProjectTransactionSchema = z.object({
  id: z.string(),
  date: z.date(),
  category: z.enum(ProjectTransactionCategory).optional(),
  fromProject: z.string().nullable().optional(),
  toProject: z.string(),
  amount: z.number(),
  description: z.string().optional(),
  incomeSource: z.string().optional().nullable(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string().optional(),
  updatedAt: z.date(),
});

export type ProjectTransaction = z.infer<typeof ProjectTransactionSchema>;
