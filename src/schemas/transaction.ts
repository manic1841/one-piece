import { TransactionCategory, TransactionType } from '@/domains/record/types';
import { BaseSchema } from '@/schemas/base';
import { z } from 'zod';

// Transaction Schema
export const TransactionCreateSchema = z.object({
  date: z.date(),
  amount: z.number(),
  type: z.enum(TransactionType),
  projectId: z.string(),
  category: z.enum(TransactionCategory),
  description: z.string().optional(),
});

export type TransactionCreate = z.infer<typeof TransactionCreateSchema>;

export const TransactionSchema = BaseSchema.extend(TransactionCreateSchema.shape);

export type Transaction = z.infer<typeof TransactionSchema>;
