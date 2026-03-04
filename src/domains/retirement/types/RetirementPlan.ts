import { z } from 'zod';

// --- Projection Result Types ---

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
