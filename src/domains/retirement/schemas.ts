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
  TRANSACTION_ENTRIES: 'transactionEntries',
} as const;

export type RetirementIncomeImportSource =
  (typeof RetirementIncomeImportSource)[keyof typeof RetirementIncomeImportSource];

export const RetirementIncomeCalculationMode = {
  FIXED: 'FIXED',
  IMPORTED: 'IMPORTED',
  DERIVED: 'DERIVED',
} as const;

export type RetirementIncomeCalculationMode =
  (typeof RetirementIncomeCalculationMode)[keyof typeof RetirementIncomeCalculationMode];

export const RetirementYearLinkMode = {
  MANUAL: 'MANUAL',
  LINKED_TO_RETIREMENT: 'LINKED_TO_RETIREMENT',
} as const;

export type RetirementYearLinkMode =
  (typeof RetirementYearLinkMode)[keyof typeof RetirementYearLinkMode];

export const CalculationMode = {
  FIXED: 'FIXED',
  SALARY_PERCENTAGE: 'SALARY_PERCENTAGE',
} as const;

export type CalculationMode = (typeof CalculationMode)[keyof typeof CalculationMode];

export const SalaryPercentageRetirementMode = {
  MANUAL_FALLBACK: 'MANUAL_FALLBACK',
  INFLATION_BASED: 'INFLATION_BASED',
} as const;

export type SalaryPercentageRetirementMode =
  (typeof SalaryPercentageRetirementMode)[keyof typeof SalaryPercentageRetirementMode];

export const RetirementTransitionMode = {
  IMMEDIATE: 'IMMEDIATE',
  GRADUAL: 'GRADUAL',
} as const;

export type RetirementTransitionMode =
  (typeof RetirementTransitionMode)[keyof typeof RetirementTransitionMode];

// --- Sub-Schemas ---

export const RetirementIncomeSourceSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    importedFrom: z.enum(RetirementIncomeImportSource).default(RetirementIncomeImportSource.MANUAL),
    incomeCalculationMode: z
      .enum(RetirementIncomeCalculationMode)
      .default(RetirementIncomeCalculationMode.FIXED),
    calculatedFrom: z
      .object({
        ledgerCode: z.string().optional(),
        sampleYear: z.number(),
        totalAmount: z.number(),
        monthlyAverage: z.number(),
        sampleCount: z.number(),
        importedAt: z.string(),
      })
      .optional(),
    autoUpdate: z.boolean().default(false),
    incomeCategory: z.string().optional(),
    derivedFrom: z
      .object({
        baseIncomeId: z.string(),
        multiplier: z.number().positive(),
      })
      .optional(),
    type: z.enum(RetirementIncomeType),
    startYearMode: z.enum(RetirementYearLinkMode).default(RetirementYearLinkMode.MANUAL),
    endYearMode: z.enum(RetirementYearLinkMode).default(RetirementYearLinkMode.MANUAL),
    lifelong: z.boolean().default(false),
    startYear: z.number(),
    endYear: z.number().optional(),
    baseAmount: z.number(),
    growthRate: z.number(),
    note: z.string().optional(),
  })
  .superRefine((income, ctx) => {
    if (
      income.incomeCalculationMode === RetirementIncomeCalculationMode.DERIVED &&
      !income.derivedFrom
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'derivedFrom is required when incomeCalculationMode is DERIVED',
      });
    }

    if (
      !income.lifelong &&
      income.endYearMode === RetirementYearLinkMode.MANUAL &&
      typeof income.endYear !== 'number'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endYear is required when lifelong is false and endYearMode is MANUAL',
      });
    }

    if (
      !income.lifelong &&
      typeof income.endYear === 'number' &&
      income.endYear < income.startYear
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endYear must be greater than or equal to startYear',
      });
    }
  });

export const RetirementExpenseType = {
  GENERAL: 'general',
  DEBT_PAYMENT: 'debt_payment',
} as const;

export type RetirementExpenseType =
  (typeof RetirementExpenseType)[keyof typeof RetirementExpenseType];

export const RetirementExpenseCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceDebtAccountId: z.string().optional(),
  type: z.enum(RetirementExpenseType).default(RetirementExpenseType.GENERAL),
  includesPrincipal: z.boolean().default(false),
  interestOnly: z.boolean().default(false),
  calculatedFrom: z
    .object({
      debtAccountId: z.string().optional(),
      sampleStartYearMonth: z.string().optional(),
      sampleEndYearMonth: z.string().optional(),
      totalPaid: z.number().optional(),
      interestPaid: z.number().optional(),
      sampleCount: z.number().optional(),
      importedAt: z.string().optional(),
    })
    .optional(),
  // Calculation mode — determines how the annual amount is derived
  calculationMode: z.enum(CalculationMode).default(CalculationMode.FIXED),
  // FIXED mode: annual base amount inflated by growthRate each year
  baseAmount: z.number(),
  // SALARY_PERCENTAGE mode: fraction of the linked income stream (0.0 to 1.0)
  salaryPercentage: z.number().min(0).max(1).optional(),
  // SALARY_PERCENTAGE mode: how to derive post-retirement expense
  salaryPercentageRetirementMode: z
    .enum(SalaryPercentageRetirementMode)
    .default(SalaryPercentageRetirementMode.INFLATION_BASED),
  // ID of the income source to link; if absent, uses total salary
  linkedIncomeId: z.string().optional(),
  // Post-retirement flat annual amount for SALARY_PERCENTAGE mode (inflates from retirement year)
  fallbackAmount: z.number().optional(),
  growthRate: z.number(),
  retirementMultiplier: z.number(), // 0.0 to 1.0+ (FIXED mode post-retirement multiplier)
  startYear: z.number(),
  endYear: z.number().nullable().optional(),
  /** @deprecated Use calculationMode + salaryPercentage instead */
  percentOfSalary: z.number().optional(),
  note: z.string().optional(),
});

export const RetirementOneTimeEventSchema = z
  .object({
    id: z.string(),
    type: z.enum(['income', 'expense']),
    name: z.string(),
    calculationMode: z.enum(CalculationMode).default(CalculationMode.FIXED),
    phases: z
      .array(
        z
          .object({
            name: z.string(),
            startYear: z.number(),
            endYear: z.number(),
            mode: z.enum(CalculationMode),
            amount: z.number().optional(),
            growthRate: z.number().optional(),
            percentage: z.number().min(0).max(1).optional(),
            linkedIncomeId: z.string().optional(),
          })
          .superRefine((phase, ctx) => {
            if (phase.endYear < phase.startYear) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'endYear must be greater than or equal to startYear',
              });
            }

            if (phase.mode === CalculationMode.FIXED && typeof phase.amount !== 'number') {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'amount is required when mode is FIXED',
              });
            }

            if (
              phase.mode === CalculationMode.SALARY_PERCENTAGE &&
              typeof phase.percentage !== 'number'
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'percentage is required when mode is SALARY_PERCENTAGE',
              });
            }
          }),
      )
      .optional(),
    // Backward compatibility for legacy one-time events
    year: z.number().optional(),
    amount: z.number().optional(),
    note: z.string().optional(),
  })
  .superRefine((event, ctx) => {
    const hasPhases = Array.isArray(event.phases) && event.phases.length > 0;
    const hasLegacyOneTime = typeof event.year === 'number' && typeof event.amount === 'number';

    if (!hasPhases && !hasLegacyOneTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'event requires phases or legacy year/amount fields',
      });
    }
  });

export const RetirementTransitionSchema = z.object({
  mode: z.enum(RetirementTransitionMode).default(RetirementTransitionMode.IMMEDIATE),
  // Number of years to linearly transition from full expense to retirementMultiplier
  transitionYears: z.number().int().min(1).default(1),
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

  // Retirement spending transition setting
  retirementTransition: RetirementTransitionSchema.optional(),

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
  incomeBreakdown: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
    }),
  ),
  expenseBreakdown: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
    }),
  ),
  closingBalance: z.number(),

  events: z.array(z.string()), // Names of events happening this year
});
