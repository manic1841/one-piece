import { z } from 'zod';
import { TimestampSchema } from './helper';

// IncomeCategory Schema
export const IncomeCategorySchema = z.enum(['salary', 'bonus', 'investment', 'other']);

export type IncomeCategory = z.infer<typeof IncomeCategorySchema>;

export const PlannedIncomeAllocationSchema = z.object({
  projectId: z.string(),
  percentage: z.number().min(0).max(100),
  lastUsedAmount: z.number().optional(),
});
export type PlannedIncomeAllocation = z.infer<typeof PlannedIncomeAllocationSchema>;

export const PlannedIncomeUserSettingsSchema = z.object({
  modifiedAt: TimestampSchema.optional(),
  adjustedAllocations: z
    .array(
      z.object({
        projectId: z.string(),
        percentage: z.number().min(0).max(100),
      }),
    )
    .optional(),
});
export type PlannedIncomeUserSettings = z.infer<typeof PlannedIncomeUserSettingsSchema>;

// IncomeTransaction Schema
export const PlannedIncome = z.object({
  id: z.string(),
  date: z.union([TimestampSchema, z.instanceof(Date)]),
  amount: z.number(),
  category: IncomeCategorySchema,
  description: z.string().optional(),
  createdBy: z.string(),
  createdAt: TimestampSchema,
  allocations: z.array(PlannedIncomeAllocationSchema),
  userSettings: PlannedIncomeUserSettingsSchema,
});

export type PlannedIncome = z.infer<typeof PlannedIncome>;

// Budget allocation for a single income source
export const IncomeBudgetAllocationSchema = z.record(z.string(), z.number());

export type IncomeBudgetAllocation = z.infer<typeof IncomeBudgetAllocationSchema>;

// Budget allocations for all income sources
export const BudgetAllocationsSchema = z.object({
  salary: IncomeBudgetAllocationSchema,
  bonus: IncomeBudgetAllocationSchema,
  investment: IncomeBudgetAllocationSchema,
  other: IncomeBudgetAllocationSchema,
});

export type BudgetAllocations = z.infer<typeof BudgetAllocationsSchema>;

// Monthly Budget Stats Schema
export const MonthlyCategoryStatSchema = z.object({
  category: z.string(),
  percentage: z.number(),
  allocated: z.number(),
  spent: z.number(),
  remaining: z.number(),
  percentageUsed: z.number(),
  isOverBudget: z.boolean(),
});

export type MonthlyCategoryStat = z.infer<typeof MonthlyCategoryStatSchema>;

export const MonthlyBudgetStatsSchema = z.object({
  totalIncome: z.number(),
  incomeBreakdown: z.record(IncomeCategorySchema, z.number()),
  stats: z.array(MonthlyCategoryStatSchema),
});

export type MonthlyBudgetStats = z.infer<typeof MonthlyBudgetStatsSchema>;

export const MonthlyBudgetSchema = z.object({
  householdId: z.string(),
  year: z.number(),
  month: z.number(),
  totalIncome: z.number(),
  incomeBreakdown: z.record(IncomeCategorySchema, z.number()),
  budgets: z.record(
    z.string(),
    z.object({
      allocated: z.number(),
      spent: z.number(),
    }),
  ),
  createdAt: TimestampSchema,
});

export type MonthlyBudget = z.infer<typeof MonthlyBudgetSchema>;
