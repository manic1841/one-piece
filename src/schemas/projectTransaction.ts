import { z } from 'zod';

import { ProjectTransactionCategory } from '@/domains/record/types/categories';
import { BaseSchema } from '@/schemas/base';

// ProjectTransaction Schema
export const ProjectTransactionCreateSchema = z.object({
  date: z.date(),
  category: z.nativeEnum(ProjectTransactionCategory),
  fromProjectId: z.string().nullable().optional(),
  toProjectId: z.string().nullable().optional(),
  amount: z.number(),
  description: z.string().optional(),
  incomeSource: z.string().nullable().optional(),
});

export type ProjectTransactionCreate = z.infer<typeof ProjectTransactionCreateSchema>;

export const ProjectTransactionSchema = BaseSchema.extend(ProjectTransactionCreateSchema.shape);

export type ProjectTransaction = z.infer<typeof ProjectTransactionSchema>;
