import { z } from 'zod';

import { ProjectExpenseBehavior, ProjectIncomeBehavior } from '@/domains/project/types/categories';
import { BaseSchema } from '@/schemas';

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

  category: z.string(),

  isActive: z.boolean().default(true),

  accounting: z
    .object({
      enabled: z.boolean().default(false),

      flowBehavior: z
        .object({
          incomeAs: z
            .nativeEnum(ProjectIncomeBehavior)
            .default(ProjectIncomeBehavior.INCREASE_INCOME),
          expenseAs: z
            .nativeEnum(ProjectExpenseBehavior)
            .default(ProjectExpenseBehavior.INCREASE_EXPENSE),
        })
        .optional(),

      incomeStatement: z
        .object({
          category: z.string(),
          subcategory: z.string().nullable().optional(),
          order: z.number().optional(),
        })
        .optional(),

      cashFlow: z
        .object({
          category: z.string(),
          subcategory: z.string().nullable().optional(),
          order: z.number().optional(),
        })
        .optional(),

      balanceSheet: z
        .object({
          category: z.string(),
          subcategory: z.string().nullable().optional(),
          order: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;

export const ProjectSchema = BaseSchema.extend(ProjectCreateSchema.shape);

export type Project = z.infer<typeof ProjectSchema>;
