import { TransactionCategory } from '@/domains/record/types/categories';
import { TransactionType } from '@/domains/record/types/transactionType';
import { BaseSchema } from '@/schemas/base';
import { z } from 'zod';

// Transaction Schema
export const TransactionCreateSchema = z.object({
  date: z.date(),
  amount: z.number(),
  type: z.nativeEnum(TransactionType),
  projectId: z.string(),
  category: z.nativeEnum(TransactionCategory),
  description: z.string().optional(),
});

export type TransactionCreate = z.infer<typeof TransactionCreateSchema>;

export const TransactionSchema = BaseSchema.extend(TransactionCreateSchema.shape);

export type Transaction = z.infer<typeof TransactionSchema>;
