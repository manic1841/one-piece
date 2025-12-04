import { z } from 'zod';
import { HoldingSchema } from './account';
import { AccountCategory } from '@/domains/account/accountCategory';

// Portfolio Schema
export const PortfolioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  accountIds: z.array(z.string()),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Portfolio = z.infer<typeof PortfolioSchema>;

// Portfolio Account Snapshot (embedded in PortfolioSnapshot)
export const PortfolioAccountSnapshotSchema = z.object({
  accountId: z.string(),
  accountName: z.string(),
  type: z.enum(AccountCategory),
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

// Portfolio Snapshot Schema
export const PortfolioSnapshotSchema = z.object({
  id: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  accounts: z.array(PortfolioAccountSnapshotSchema),
  totalValue: z.number(),
  cashFlow: PortfolioCashFlowSchema,
  performance: PortfolioPerformanceSchema,
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string(),
  updatedAt: z.date(),
});

export type PortfolioSnapshot = z.infer<typeof PortfolioSnapshotSchema>;
