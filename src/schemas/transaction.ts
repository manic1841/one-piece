import { z } from 'zod';
import { TimestampSchema } from './helper';
import { TransactionType } from '@/domains/transaction/transactionType';

// Transaction Schema
export const TransactionSchema = z.object({
  id: z.string(),
  date: z.union([TimestampSchema, z.instanceof(Date)]),
  amount: z.number(),
  type: z.enum(TransactionType),
  projectId: z.string(),
  category: z.string(),
  description: z.string().optional(),
  createdBy: z.string(),
  createdAt: TimestampSchema,
});

export type Transaction = z.infer<typeof TransactionSchema>;
