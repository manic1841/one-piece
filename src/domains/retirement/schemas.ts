import { z } from 'zod';

import { BaseSchema } from '@/infra/schemas/base';

// --- Categories and Enums ---

export const RetirementIncomeType = {
  SALARY: 'salary',
  BONUS: 'bonus',
  PENSION: 'pension',
  RENT: 'rent',
  OTHER: 'other',
} as const;

export type RetirementIncomeType = (typeof RetirementIncomeType)[keyof typeof RetirementIncomeType];

export const RetirementIncomeImportSource = {
  MANUAL: 'manual',
  PLANNED_INCOME: 'plannedIncome',
} as const;

export type RetirementIncomeImportSource =
  (typeof RetirementIncomeImportSource)[keyof typeof RetirementIncomeImportSource];

// --- Sub-Schemas ---

export const RetirementIncomeSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  importedFrom: z
    .nativeEnum(RetirementIncomeImportSource)
    .default(RetirementIncomeImportSource.MANUAL),
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
  incomeCategory: z.string().optional(),
  type: z.nativeEnum(RetirementIncomeType),
  startYear: z.number(),
  endYear: z.number(),
  baseAmount: z.number(),
  growthRate: z.number(),
  note: z.string().optional(),
});

export const RetirementExpenseCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceProjectId: z.string().optional(),
  baseAmount: z.number(),
  growthRate: z.number(),
  retirementMultiplier: z.number(), // 0.0 to 1.0+
  startYear: z.number(),
  endYear: z.number().nullable().optional(),
  percentOfSalary: z.number().optional(),
  note: z.string().optional(),
});

export const RetirementOneTimeEventSchema = z.object({
  id: z.string(),
  year: z.number(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  name: z.string(),
  note: z.string().optional(),
});

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
  salaryGrowthRate: z.number(),
  inflationRate: z.number(), // e.g. 2.0 (percentage)
  investmentReturnRate: z.number(), // e.g. 5.0 (percentage)

  // Import Settings
  importSettings: z
    .object({
      fromProjects: z.boolean(),
      importDate: z.any().optional(), // Allow Timestamp
      referenceMonths: z.number().default(12),
      projectMappings: z.record(z.string(), z.string()).optional(),
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
      lastCalculatedAt: z.any(), // Allow Timestamp
    })
    .optional(),
});

export const RetirementPlanSchema = BaseSchema.extend(RetirementPlanCreateSchema.shape);

// --- Projection Types ---

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
