import { z } from 'zod';

// Import HoldingSchema from account domain
import { HoldingSchema } from '@/domains/account/types/account';
import { BaseSchema } from '@/infra/schemas/base';

// Portfolio Account Snapshot (embedded in PortfolioSnapshot)
export const PortfolioAccountSnapshotSchema = z.object({
  accountId: z.string(),
  accountName: z.string(),
  category: z.enum(['bank', 'securities', 'cash', 'other']),
  value: z.number(),
  holdings: z.array(HoldingSchema).optional(),
});

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

// Portfolio Cash Flow Schema
export const PortfolioCashFlowSchema = z.object({
  deposits: z.number(),
  withdrawals: z.number(),
});

// Portfolio Create Schema
export const PortfolioCreateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  accountIds: z.array(z.string()),
  isActive: z.boolean().default(true),
  order: z.number().default(0),
});

export const PortfolioSchema = BaseSchema.extend(PortfolioCreateSchema.shape);
export type PortfolioCreate = z.infer<typeof PortfolioCreateSchema>;
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

export const PortfolioSnapshotSchema = BaseSchema.extend(PortfolioSnapshotCreateSchema.shape);
export type PortfolioSnapshotCreate = z.infer<typeof PortfolioSnapshotCreateSchema>;
export type PortfolioSnapshot = z.infer<typeof PortfolioSnapshotSchema>;
