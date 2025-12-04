import { z } from 'zod';
import { BalanceSheetSourceType } from '@/domains/finance/financeType';

/**
 * Balance sheet item (asset or liability)
 */
export const BalanceSheetItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  order: z.number().int().optional(),
  // Reference to source (account ID, project ID, etc.)
  sourceType: z.enum(BalanceSheetSourceType).optional(),
  sourceId: z.string().optional(),
});

export type BalanceSheetItem = z.infer<typeof BalanceSheetItemSchema>;

/**
 * Category with items and subtotal
 */
export const BalanceSheetCategorySchema = z.object({
  category: z.string(),
  items: z.array(BalanceSheetItemSchema),
  subtotal: z.number(),
  order: z.number().int().optional(),
});

export type BalanceSheetCategory = z.infer<typeof BalanceSheetCategorySchema>;

/**
 * Asset section
 */
export const AssetSectionSchema = z.object({
  current: z.array(BalanceSheetCategorySchema).default([]), // 流動資產
  investment: z.array(BalanceSheetCategorySchema).default([]), // 投資資產
  fixed: z.array(BalanceSheetCategorySchema).default([]), // 固定資產
  total: z.number(),
});

export type AssetSection = z.infer<typeof AssetSectionSchema>;

/**
 * Liability section
 */
export const LiabilitySectionSchema = z.object({
  shortTerm: z.array(BalanceSheetCategorySchema).default([]), // 短期負債
  longTerm: z.array(BalanceSheetCategorySchema).default([]), // 長期負債
  total: z.number(),
});

export type LiabilitySection = z.infer<typeof LiabilitySectionSchema>;

/**
 * Complete Balance Sheet
 */
export const BalanceSheetSchema = z.object({
  id: z.string(),
  asOfDate: z.date(), // 截至日期
  year: z.number().int(),
  month: z.number().int(),

  assets: AssetSectionSchema,
  liabilities: LiabilitySectionSchema,

  // Net worth (equity) = Assets - Liabilities
  netWorth: z.number(),

  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string(),
  updatedAt: z.date(),
});

export type BalanceSheet = z.infer<typeof BalanceSheetSchema>;
