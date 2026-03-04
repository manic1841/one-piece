import { z } from 'zod';

import { RetirementIncomeType } from '@/domains/retirement/types/categories';
import { BaseSchema } from '@/schemas/base';

// --- Sub-Schemas ---

export const RetirementIncomeSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  importedFrom: z.enum(['manual', 'plannedIncome']).default('manual'),
  calculatedFrom: z
    .object({
      startDate: z.string(),
      endDate: z.string(),
      totalAmount: z.number(),
      monthlyAverage: z.number(),
      sampleCount: z.number(),
      importedAt: z.string(),
    })
    .optional(),
  incomeCategory: z.string().optional(), // Linked to PlannedIncomeCategory if imported
  type: z.enum(RetirementIncomeType),
  startYear: z.number(),
  endYear: z.number(),
  baseAmount: z.number(), // Annual amount at startYear
  growthRate: z.number(), // Percentage (e.g., 3.0 for 3%)
  note: z.string().optional(),
});

export type RetirementIncomeSource = z.infer<typeof RetirementIncomeSourceSchema>;

export const RetirementExpenseCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceProjectId: z.string().optional(), // If imported from a Project
  baseAmount: z.number(), // Annual amount
  growthRate: z.number(), // Percentage
  retirementMultiplier: z.number(), // 0.0 - 1.0+ (e.g., 0.7 for 70%)
  startYear: z.number(),
  endYear: z.number().nullable().optional(), // null means lifetime
  percentOfSalary: z.number().optional(), // Percentage of total salary to use as minimum expense
  note: z.string().optional(),
});

export type RetirementExpenseCategory = z.infer<typeof RetirementExpenseCategorySchema>;

export const RetirementOneTimeEventSchema = z.object({
  id: z.string(),
  year: z.number(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  name: z.string(),
  note: z.string().optional(),
});

export type RetirementOneTimeEvent = z.infer<typeof RetirementOneTimeEventSchema>;

// --- Main Plan Schema ---

export const RetirementPlanCreateSchema = z.object({
  name: z.string(),
  isActive: z.boolean().default(true),
  autoUpdate: z.boolean().default(false),

  // Assumptions
  currentYear: z.number(),
  birthYear: z.number(),
  retirementAge: z.number(),
  lifeExpectancy: z.number(),
  currentSavings: z.number(),
  salaryGrowthRate: z.number(), // Percentage
  inflationRate: z.number(), // Percentage
  investmentReturnRate: z.number(), // Percentage

  // Import Settings
  importSettings: z
    .object({
      fromProjects: z.boolean(),
      importDate: z.date().optional(),
      referenceMonths: z.number().default(12),
      projectMappings: z.record(z.string(), z.string()).optional(), // projectId -> expenseCategoryId (if needed)
    })
    .optional(),

  // Data Collections
  incomes: z.array(RetirementIncomeSourceSchema).default([]),
  expenses: z.array(RetirementExpenseCategorySchema).default([]),
  events: z.array(RetirementOneTimeEventSchema).default([]),

  // Cached Results
  summary: z
    .object({
      retirementYear: z.number(),
      savingsAtRetirement: z.number(),
      minSavings: z.number(),
      minSavingsYear: z.number(),
      isBankrupt: z.boolean(),
      lastCalculatedAt: z.date(),
    })
    .optional(),
});

export type RetirementPlanCreate = z.infer<typeof RetirementPlanCreateSchema>;

export const RetirementPlanSchema = BaseSchema.extend(RetirementPlanCreateSchema.shape);

export type RetirementPlan = z.infer<typeof RetirementPlanSchema>;
