import { z } from 'zod';
import { TransactionType, TransactionCategory } from '@/domains/record/types';

// Transaction Schema
export const TransactionSchema = z.object({
  id: z.string(),
  date: z.date(),
  amount: z.number(),
  type: z.enum(TransactionType),
  projectId: z.string(),
  category: z.enum(TransactionCategory),
  description: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string().optional(),
  updatedAt: z.date(),
});

export type Transaction = z.infer<typeof TransactionSchema>;
