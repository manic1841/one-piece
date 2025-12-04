import { z } from 'zod';
import { ProjectCategory, ProjectTransactionType } from '../domains/project/projectCategory';
import {
  IncomeStatementCategory,
  CashFlowCategory,
  BalanceSheetCategory,
} from '../domains/finance/finaceCategory';

// ProjectSnapshot Schema
export const ProjectSnapshotSchema = z.object({
  id: z.string(),
  year: z.number(),
  month: z.number(),
  openingBalance: z.number(),
  income: z.number(),
  expense: z.number(),
  closingBalance: z.number(),
  createdAt: z.date(),
});

export type ProjectSnapshot = z.infer<typeof ProjectSnapshotSchema>;

// Project Schema
export const ProjectSchema = z.object({
  id: z.string(),
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

  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date(),
  updatedBy: z.string().optional(),

  // subcollection
  snapshots: z.array(ProjectSnapshotSchema).optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

// ProjectTransaction Schema
export const ProjectTransactionSchema = z.object({
  id: z.string(),
  date: z.date(),
  type: z.enum(ProjectTransactionType),
  fromProject: z.string().nullable().optional(),
  toProject: z.string(),
  amount: z.number(),
  description: z.string().optional(),
  incomeSource: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string().optional(),
  updatedAt: z.date(),
});

export type ProjectTransaction = z.infer<typeof ProjectTransactionSchema>;
