import { z } from 'zod';
import { TimestampSchema } from './helper';

// --- Sub-Schemas ---

export const RetirementIncomeSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceProjectId: z.string().optional(), // If imported from a Project
  type: z.enum(['salary', 'bonus', 'pension', 'rent', 'other']),
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

export const RetirementPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean().default(true),
  createdBy: z.string(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,

  // Assumptions
  currentYear: z.number(),
  currentAge: z.number(),
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
      importDate: TimestampSchema.optional(),
      referenceMonths: z.number().default(12),
      projectMappings: z.record(z.string(), z.string()).optional(), // projectId -> expenseCategoryId (if needed)
    })
    .optional(),

  // Data Collections (Embedded for simplicity in this document structure,
  // but could be subcollections in Firestore if large.
  // Given the typical size of a personal plan, arrays are likely fine and easier to query/copy.)
  incomes: z.array(RetirementIncomeSourceSchema).default([]),
  expenses: z.array(RetirementExpenseCategorySchema).default([]),
  events: z.array(RetirementOneTimeEventSchema).default([]),

  // Cached Results (Optional, for quick list view)
  summary: z
    .object({
      retirementYear: z.number(),
      savingsAtRetirement: z.number(),
      minSavings: z.number(),
      minSavingsYear: z.number(),
      isBankrupt: z.boolean(),
      lastCalculatedAt: TimestampSchema,
    })
    .optional(),
});

export type RetirementPlan = z.infer<typeof RetirementPlanSchema>;

// --- Projection Result Types (Not stored in DB, used for calculation return) ---

export const RetirementProjectionYearSchema = z.object({
  year: z.number(),
  age: z.number(),
  isRetired: z.boolean(),

  // Cash Flow
  totalIncome: z.number(),
  totalExpense: z.number(),
  netCashFlow: z.number(),

  // Balance
  openingBalance: z.number(),
  investmentIncome: z.number(),
  oneTimeIncome: z.number(),
  oneTimeExpense: z.number(),
  closingBalance: z.number(),

  events: z.array(z.string()), // Names of events happening this year
});

export type RetirementProjectionYear = z.infer<typeof RetirementProjectionYearSchema>;
