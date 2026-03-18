import { z } from 'zod';

import { BaseSchema } from '@/infra/schemas/base';

export const AllocationItemSchema = z.object({
  projectId: z.string(),
  percentage: z.number(),
  amount: z.number(),
});
export type AllocationItem = z.infer<typeof AllocationItemSchema>;

export const AllocationCreateSchema = z.object({
  date: z.date(),
  description: z.string().optional(),
  sourceTransactionId: z.string(),
  totalAmount: z.number(),
  createdBy: z.string(),
  items: z.array(AllocationItemSchema),
  projectIds: z.array(z.string()), // Denormalization index
});
export type AllocationCreate = z.infer<typeof AllocationCreateSchema>;

export const AllocationSchema = BaseSchema.extend(AllocationCreateSchema.shape);
export type Allocation = z.infer<typeof AllocationSchema>;
