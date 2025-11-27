import { z } from 'zod';
import { TimestampSchema } from './helper';

// IncomeCategory Schema
export const IncomeCategorySchema = z.enum(['salary', 'bonus', 'investment', 'other']);

export type IncomeCategory = z.infer<typeof IncomeCategorySchema>;

// PlannedIncome related schemas moved to plannedIncome.ts

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
