import { AccountCategory } from '@/domains/account/accountCategory';
import { BaseSchema } from '@/schemas';
import { z } from 'zod';

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
export const AccountSnapshotCreateSchema = z.object({
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

export type AccountSnapshotCreate = z.infer<typeof AccountSnapshotCreateSchema>;

export const AccountSnapshotSchema = BaseSchema.extend(AccountSnapshotCreateSchema.shape);

export type AccountSnapshot = z.infer<typeof AccountSnapshotSchema>;

// Account Schema
export const AccountCreateSchema = z.object({
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

export type AccountCreate = z.infer<typeof AccountCreateSchema>;

export const AccountSchema = BaseSchema.extend(AccountCreateSchema.shape);

export type Account = z.infer<typeof AccountSchema>;
