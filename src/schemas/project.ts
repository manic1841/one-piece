import { z } from 'zod';
import { TimestampSchema } from './helper';

// ProjectSnapshot Schema
export const ProjectSnapshotSchema = z.object({
  id: z.string(),
  year: z.number(),
  month: z.number(),
  openingBalance: z.number(),
  income: z.number(),
  expense: z.number(),
  closingBalance: z.number(),
  createdAt: TimestampSchema,
});

export type ProjectSnapshot = z.infer<typeof ProjectSnapshotSchema>;

// ProjectCategory Enum
export const ProjectCategory = {
  // 一般專案（日常記帳）
  OPERATING: 'operating',          // 營運類：生活、居住、交通

  // 特殊專案（會計報表）
  FINANCING: 'financing',          // 融資類：房貸、車貸
  INVESTING: 'investing',          // 投資類：股票、基金
  ASSET: 'asset',                  // 資產類：不動產、固定資產
  LIABILITY: 'liability',          // 負債類：長期債務

  // 調節專案（差異處理）
  RECONCILIATION: 'reconciliation', // 調節類：現金短少、收入短少

  // 個人專案（不計入家庭報表）
  PERSONAL: 'personal'             // 個人零用錢
} as const;

export type ProjectCategory = typeof ProjectCategory[keyof typeof ProjectCategory];

// Project Schema
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  order: z.number(),
  description: z.string().optional(),

  category: z.nativeEnum(ProjectCategory),

  isPersonal: z.boolean().default(false),
  isActive: z.boolean().default(true),

  accounting: z.object({
    enabled: z.boolean().default(false),

    incomeStatement: z.object({
      category: z.enum(['income', 'expense']),
      subcategory: z.string(),
      order: z.number().optional(),
    }).optional(),

    cashFlow: z.object({
      activity: z.enum(['operating', 'investing', 'financing', 'reconciliation']),
      subcategory: z.string(),
      order: z.number().optional(),
    }).optional(),

    balanceSheet: z.object({
      category: z.enum(['asset', 'liability', 'equity']),
      subcategory: z.enum(['current', 'fixed', 'investment', 'longTerm', 'shortTerm']),
      order: z.number().optional(),
      isDebt: z.boolean().optional(),
      isInvestment: z.boolean().optional(),
      isRealEstate: z.boolean().optional(),
    }).optional(),
  }).optional(),

  createdAt: TimestampSchema.optional(),
  createdBy: z.string(),
  updatedAt: TimestampSchema.optional(),
  updatedBy: z.string().optional(),

  // subcollection
  snapshots: z.array(ProjectSnapshotSchema).optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

// ProjectTransactionType Schema
export const ProjectTransactionTypeSchema = z.enum(['allocation', 'transfer', 'adjustment']);

export type ProjectTransactionType = z.infer<typeof ProjectTransactionTypeSchema>;

// ProjectTransaction Schema
export const ProjectTransactionSchema = z.object({
  id: z.string(),
  date: z.union([TimestampSchema, z.instanceof(Date)]),
  type: ProjectTransactionTypeSchema,
  fromProject: z.string().nullable().optional(),
  toProject: z.string(),
  amount: z.number(),
  description: z.string().optional(),
  incomeSource: z.string().optional(),
  createdBy: z.string(),
  createdAt: TimestampSchema,
});

export type ProjectTransaction = z.infer<typeof ProjectTransactionSchema>;
