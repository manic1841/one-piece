import { z } from 'zod';
import { TimestampSchema } from './helper';

// AccountType
export const AccountTypeSchema = z.enum(['bank', 'cash', 'investment', 'other']);

export type AccountType = z.infer<typeof AccountTypeSchema>;

// AccountSnapshotModel Schema
export const AccountSnapshotSchema = z.object({
  id: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  amount: z.number(),
  createdBy: z.string(),
  createdAt: TimestampSchema,
});

export type AccountSnapshot = z.infer<typeof AccountSnapshotSchema>;

// Account Schema
export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AccountTypeSchema,
  currency: z.string(),
  includeInReconciliation: z.boolean().default(true).optional(),
  createdAt: TimestampSchema,
  // subcollection
  snapshots: z.array(AccountSnapshotSchema).optional(),
});

export type Account = z.infer<typeof AccountSchema>;
