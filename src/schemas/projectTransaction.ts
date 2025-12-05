import { z } from 'zod';
import { ProjectTransactionType } from '@/domains/project/projectCategory';

// ProjectTransaction Schema
export const ProjectTransactionSchema = z.object({
  id: z.string(),
  date: z.date(),
  type: z.enum(ProjectTransactionType),
  fromProject: z.string().nullable().optional(),
  toProject: z.string(),
  amount: z.number(),
  description: z.string().optional(),
  incomeSource: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string().optional(),
  updatedAt: z.date(),
});

export type ProjectTransaction = z.infer<typeof ProjectTransactionSchema>;
