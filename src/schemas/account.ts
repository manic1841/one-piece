import { z } from 'zod';

import { AccountCategory, CurrencyType } from '@/domains/account/types/category';
import { BaseSchema } from '@/schemas';

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
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  amount: z.number(),
  holdings: z.array(HoldingSchema).optional(),
});

export type AccountSnapshotCreate = z.infer<typeof AccountSnapshotCreateSchema>;

export const AccountSnapshotSchema = BaseSchema.extend(AccountSnapshotCreateSchema.shape);

export type AccountSnapshot = z.infer<typeof AccountSnapshotSchema>;

// Account Schema
export const AccountCreateSchema = z.object({
  name: z.string(),
  type: z.enum(AccountCategory).optional(), // for backward compatibility
  category: z.enum(AccountCategory).optional(), // for backward compatibility
  currency: z.enum(CurrencyType),
  // subcollection
  snapshots: z.array(AccountSnapshotSchema).optional(),
});

export type AccountCreate = z.infer<typeof AccountCreateSchema>;

export const AccountSchema = BaseSchema.extend(AccountCreateSchema.shape);

export type Account = z.infer<typeof AccountSchema>;
