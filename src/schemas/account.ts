import { z } from 'zod';
import { AccountCategory } from '@/domains/account/accountCategory';

// Holding Schema
export const HoldingSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  quantity: z.number(),
  marketValue: z.number(),
  leverage: z.number().optional(),
});

export type Holding = z.infer<typeof HoldingSchema>;

// AccountSnapshotModel Schema
export const AccountSnapshotSchema = z.object({
  id: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  amount: z.number(),
  holdings: z.array(HoldingSchema).optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string().optional(),
  updatedAt: z.date(),
});

export type AccountSnapshot = z.infer<typeof AccountSnapshotSchema>;

// Account Schema
export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(AccountCategory),
  currency: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string().optional(),
  updatedAt: z.date(),
  // subcollection
  snapshots: z.array(AccountSnapshotSchema).optional(),
});

export type Account = z.infer<typeof AccountSchema>;
