import { z } from 'zod';
import { TransactionType } from '@/domains/transaction/transactionType';

// Transaction Schema
export const TransactionSchema = z.object({
  id: z.string(),
  date: z.date(),
  amount: z.number(),
  type: z.enum(TransactionType),
  projectId: z.string(),
  category: z.string(),
  description: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date(),
});

export type Transaction = z.infer<typeof TransactionSchema>;
