import { z } from 'zod';

import { AccountCategory, CurrencyType } from '@/domains/account/types/categories';
import { BaseSchema } from '@/infra/schemas/base';

// Holding Schema
export const HoldingSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  quantity: z.number(),
  cost: z.number(),
  marketValue: z.number(),
  leverage: z.number().optional(),
});

export type Holding = z.infer<typeof HoldingSchema>;

// AccountSnapshotModel Schema
export const AccountSnapshotCreateSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  amount: z.number(),
  originalAmount: z.number().optional(),
  exchangeRate: z.number().optional(),
  holdings: z.array(HoldingSchema).optional(),
});

export type AccountSnapshotCreate = z.infer<typeof AccountSnapshotCreateSchema>;

export const AccountSnapshotSchema = BaseSchema.extend(AccountSnapshotCreateSchema.shape);

export type AccountSnapshot = z.infer<typeof AccountSnapshotSchema>;

// Account Schema
export const AccountCreateSchema = z.object({
  name: z.string(),
  category: z.enum(AccountCategory),
  currency: z.enum(CurrencyType),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});

export type AccountCreate = z.input<typeof AccountCreateSchema>;

export const AccountSchema = BaseSchema.extend(AccountCreateSchema.shape);

export type Account = z.infer<typeof AccountSchema>;
