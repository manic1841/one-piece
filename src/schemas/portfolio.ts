import { z } from 'zod';

import { AccountCategory } from '@/domains/account/types/categories';
import { BaseSchema } from '@/schemas/base';

import { HoldingSchema } from './account';

// Portfolio Account Snapshot (embedded in PortfolioSnapshot)
export const PortfolioAccountSnapshotSchema = z.object({
  accountId: z.string(),
  accountName: z.string(),
  category: z.enum(AccountCategory),
  value: z.number(),
  holdings: z.array(HoldingSchema).optional(),
});

export type PortfolioAccountSnapshot = z.infer<typeof PortfolioAccountSnapshotSchema>;

// Portfolio Performance Schema
export const PortfolioPerformanceSchema = z.object({
  openingValue: z.number(),
  closingValue: z.number(),
  netCashFlow: z.number(),
  gain: z.number(),
  returnRate: z.number(),
  cumulativeGain: z.number(),
  cumulativeReturnRate: z.number(),
});

export type PortfolioPerformance = z.infer<typeof PortfolioPerformanceSchema>;

// Portfolio Cash Flow Schema
export const PortfolioCashFlowSchema = z.object({
  deposits: z.number(),
  withdrawals: z.number(),
});

export type PortfolioCashFlow = z.infer<typeof PortfolioCashFlowSchema>;

// Portfolio Create Schema
export const PortfolioCreateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  accountIds: z.array(z.string()),
  isActive: z.boolean().default(true),
  order: z.number().default(0),
});

export type PortfolioCreate = z.infer<typeof PortfolioCreateSchema>;

// Portfolio Base Schema (standardized)
export const PortfolioSchema = BaseSchema.extend(PortfolioCreateSchema.shape);

export type Portfolio = z.infer<typeof PortfolioSchema>;

// Portfolio Snapshot Create Schema
export const PortfolioSnapshotCreateSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  accounts: z.array(PortfolioAccountSnapshotSchema),
  totalValue: z.number(),
  cashFlow: PortfolioCashFlowSchema,
  performance: PortfolioPerformanceSchema,
});

export type PortfolioSnapshotCreate = z.infer<typeof PortfolioSnapshotCreateSchema>;

// Portfolio Snapshot Base Schema (standardized)
export const PortfolioSnapshotSchema = BaseSchema.extend(PortfolioSnapshotCreateSchema.shape);

export type PortfolioSnapshot = z.infer<typeof PortfolioSnapshotSchema>;
