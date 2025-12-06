import { ProjectTransactionCategory } from '@/domains/record/types';
import { BaseSchema } from '@/schemas';
import { z } from 'zod';

// ProjectTransaction Schema
export const ProjectTransactionCreateSchema = z.object({
  date: z.date(),
  category: z.enum(ProjectTransactionCategory).optional(),
  fromProjectId: z.string().nullable().optional(),
  toProjectId: z.string().nullable().optional(),
  amount: z.number(),
  description: z.string().optional(),
  incomeSource: z.string().nullable().optional(),
});

export type ProjectTransactionCreate = z.infer<typeof ProjectTransactionCreateSchema>;

export const ProjectTransactionSchema = BaseSchema.extend(ProjectTransactionCreateSchema.shape);

export type ProjectTransaction = z.infer<typeof ProjectTransactionSchema>;
