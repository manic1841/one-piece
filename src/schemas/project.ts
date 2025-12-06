import {
  BalanceSheetCategory,
  CashFlowCategory,
  IncomeStatementCategory,
} from '@/domains/finance/finaceCategory';
import { ProjectCategory } from '@/domains/project/types/category';
import { BaseSchema } from '@/schemas';
import { z } from 'zod';

// ProjectSnapshot Schema
export const ProjectSnapshotCreateSchema = z.object({
  year: z.number(),
  month: z.number(),
  openingBalance: z.number(),
  income: z.number(),
  expense: z.number(),
  closingBalance: z.number(),
});

export type ProjectSnapshotCreate = z.infer<typeof ProjectSnapshotCreateSchema>;

export const ProjectSnapshotSchema = BaseSchema.extend(ProjectSnapshotCreateSchema.shape);

export type ProjectSnapshot = z.infer<typeof ProjectSnapshotSchema>;

// Project Schema
export const ProjectCreateSchema = z.object({
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  order: z.number(),
  description: z.string().optional(),

  category: z.enum(ProjectCategory),

  isPersonal: z.boolean().default(false),
  isActive: z.boolean().default(true),

  accounting: z
    .object({
      enabled: z.boolean().default(false),

      incomeStatement: z
        .object({
          category: z.enum(IncomeStatementCategory),
          order: z.number().optional(),
        })
        .optional(),

      cashFlow: z
        .object({
          category: z.enum(CashFlowCategory),
          order: z.number().optional(),
        })
        .optional(),

      balanceSheet: z
        .object({
          category: z.enum(BalanceSheetCategory),
          order: z.number().optional(),
          isDebt: z.boolean().optional(),
          isInvestment: z.boolean().optional(),
          isRealEstate: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),

  // subcollection
  snapshots: z.array(ProjectSnapshotSchema).optional(),
});

export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;

export const ProjectSchema = BaseSchema.extend(ProjectCreateSchema.shape);

export type Project = z.infer<typeof ProjectSchema>;
