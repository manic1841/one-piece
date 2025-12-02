import { z } from 'zod';
import { TimestampSchema } from './helper';

// TransactionType Schema
export const TransactionTypeSchema = z.enum(['income', 'expense', 'transfer']);

export type TransactionType = z.infer<typeof TransactionTypeSchema>;

// Transaction Schema
export const TransactionSchema = z.object({
  id: z.string(),
  date: z.union([TimestampSchema, z.instanceof(Date)]),
  amount: z.number(),
  type: TransactionTypeSchema,
  projectId: z.string(),
  category: z.string(),
  description: z.string().optional(),
  createdBy: z.string(),
  createdAt: TimestampSchema,
});

export type Transaction = z.infer<typeof TransactionSchema>;
