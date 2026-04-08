import { z } from 'zod';

import { BaseSchema } from '@/infra/schemas/base';

import { AccountCategory, CurrencyType } from './categories';

// [DOMAIN ENTITY]
// IMPORTANT: Account represents a PHYSICAL entity (Bank Account, Cash, Securities Account).
// It is used for balance tracking and valuation.
// It is NOT an accounting subject (ledger code). Accounting subjects are strings in the Ledger.

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

// AccountSnapshot Schema
export const AccountSnapshotCreateSchema = z.object({
  accountId: z.string(),
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
  category: z.nativeEnum(AccountCategory),
  currency: z.nativeEnum(CurrencyType),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});

export type AccountCreate = z.input<typeof AccountCreateSchema>;

export const AccountSchema = BaseSchema.extend(AccountCreateSchema.shape);
export type Account = z.infer<typeof AccountSchema>;

export type AccountWithSnapshot = Account & { snapshot: AccountSnapshot | null };

export interface AssetDataPoint {
  date: string;
  totalAssets: number;
  accounts: Record<string, number>;
}

export interface ChartDataPoint {
  month: string;
  amount: number;
  date: Date;
}
