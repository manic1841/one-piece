import { z } from 'zod';

import { BaseSchema } from '@/shared/schemas/base';

// --- Categories and Enums ---

export const RetirementIncomeType = {
  SALARY: 'salary',
  BONUS: 'bonus',
  PENSION: 'pension',
  RENT: 'rent',
  OTHER: 'other',
} as const;

export type RetirementIncomeType = (typeof RetirementIncomeType)[keyof typeof RetirementIncomeType];

export const RetirementExpenseType = {
  GENERAL: 'general',
  DEBT_PAYMENT: 'debt_payment',
} as const;

export type RetirementExpenseType =
  (typeof RetirementExpenseType)[keyof typeof RetirementExpenseType];

// --- Sub-Schemas ---

// Growth rate semantics (issue #127 Q11): undefined -> plan inflationRate,
// 0 -> explicit no growth, > 0 -> the specified rate. Resolution happens in
// one engine helper (logic/resolveGrowthRate), never per consumer.
export const RetirementIncomeSourceSchema = z
  .object({
    id: z.string(),
    name: z.string(),
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
    incomeCategory: z.string().optional(),
    type: z.enum(RetirementIncomeType),
    lifelong: z.boolean().default(false),
    startYear: z.number(),
    endYear: z.number().optional(),
    // What the household earns today. A number is system-derived from the
    // ledger import; null = scenario-only stream with no pre-retirement
    // contribution (issue #133).
    currentAnnual: z.number().nullable(),
    // User's assumption for the retirement level; effective from the retirement
    // year (or the stream's start year when it starts after retirement).
    retirementAnnual: z.number().optional(),
    growthRate: z.number().optional(),
    note: z.string().optional(),
  })
  .superRefine((income, ctx) => {
    if (!income.lifelong && typeof income.endYear !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endYear is required when lifelong is false',
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
  // Ledger code this category was imported from; merge alignment key for
  // "Import from Ledger" (existing category -> update keeping the id).
  expenseCategory: z.string().optional(),
  // What the household spends today (last full year's actual, read-only import).
  currentAnnual: z.number(),
  growthRate: z.number().optional(),
  // Post-retirement level, applied immediately in the retirement year.
  retirementMultiplier: z.number(),
  startYear: z.number(),
  // General expense: unset = lifelong. Debt payment import fills endYear.
  endYear: z.number().nullable().optional(),
  note: z.string().optional(),
});

export const RetirementOneTimeEventSchema = z
  .object({
    id: z.string(),
    type: z.enum(['income', 'expense']),
    name: z.string(),
    phases: z
      .array(
        z.object({
          name: z.string(),
          startYear: z.number(),
          endYear: z.number(),
          amount: z.number(),
          growthRate: z.number().optional(),
        }),
      )
      .superRefine((phases, ctx) => {
        for (const phase of phases) {
          if (phase.endYear < phase.startYear) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'endYear must be greater than or equal to startYear',
            });
          }
        }
      }),
    // Backward compatibility for legacy one-time events (ADR-0035).
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

// --- Main Plan Schema ---

export const RetirementPlanCreateSchema = z.object({
  name: z.string(),
  isActive: z.boolean().default(true),
  autoUpdate: z.boolean().default(false),

  // Assumptions. The projection starting balance is not stored here — it is
  // re-derived from the latest closed period's balance sheet at calculation
  // time (issue #127 Q1).
  currentYear: z.number(),
  birthYear: z.number(),
  retirementAge: z.number(),
  lifeExpectancy: z.number(),
  inflationRate: z.number(), // e.g. 2.0 (percentage)
  investmentReturnRate: z.number(), // e.g. 5.0 (percentage)

  // Data Collections
  incomes: z.array(RetirementIncomeSourceSchema).default([]),
  expenses: z.array(RetirementExpenseCategorySchema).default([]),
  events: z.array(RetirementOneTimeEventSchema).default([]),

  // Cached Results. The two net-worth fields are optional so plans cached
  // before the rename still parse; Recalculate re-derives them (issue #130).
  summary: z
    .object({
      retirementYear: z.number(),
      startingNetWorth: z.number(),
      anchorYearMonth: z.string(),
      netWorthAtRetirement: z.number().optional(),
      finalNetWorth: z.number().optional(),
      minSavings: z.number(),
      minSavingsYear: z.number(),
      isBankrupt: z.boolean(),
      lastCalculatedAt: z.date(),
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
