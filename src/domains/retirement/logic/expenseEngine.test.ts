import { describe, expect, it } from 'vitest';

import type { RetirementExpenseCategory, RetirementPlan } from '../types';
import { calculateYearlyExpense } from './expenseEngine';

// ─── Shared test plan ─────────────────────────────────────────────────────────
const SAMPLE_YEAR = 2023;

const basePlan: RetirementPlan = {
  id: 'p1',
  householdId: 'h1',
  name: 'Test',
  isActive: true,
  autoUpdate: false,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
  currentYear: 2025,
  birthYear: 1985, // retirementYear = 1985 + 60 = 2045
  retirementAge: 60,
  lifeExpectancy: 85, // planEndYear  = 1985 + 85 = 2070
  inflationRate: 2,
  investmentReturnRate: 5,
  incomes: [],
  expenses: [],
  events: [],
};

// ─── Helper to build a general expense ───────────────────────────────────────
function generalExpense(overrides: Partial<RetirementExpenseCategory>): RetirementExpenseCategory {
  return {
    id: 'e1',
    name: 'Expense',
    type: 'general',
    includesPrincipal: false,
    interestOnly: false,
    currentAnnual: 100_000,
    growthRate: 2,
    retirementMultiplier: 70,
    startYear: 2025,
    endYear: null,
    ...overrides,
  };
}

function debtPaymentExpense(
  overrides: Partial<RetirementExpenseCategory>,
): RetirementExpenseCategory {
  return {
    id: 'e2',
    name: 'Mortgage',
    type: 'debt_payment',
    includesPrincipal: true,
    interestOnly: false,
    currentAnnual: 240_000,
    retirementMultiplier: 0,
    startYear: 2025,
    endYear: 2040,
    calculatedFrom: {
      debtAccountId: 'debt-1',
      sampleStartYearMonth: '2023-01',
      sampleEndYearMonth: '2023-12',
      totalPaid: 240_000,
      interestPaid: 120_000,
      sampleCount: 12,
      importedAt: '2024-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('expenseEngine', () => {
  describe('calculateYearlyExpense', () => {
    it('returns 0 before startYear and after endYear', () => {
      const expense = generalExpense({ startYear: 2030 });
      expect(calculateYearlyExpense(expense, 2029, basePlan, SAMPLE_YEAR)).toBe(0);

      const bounded = generalExpense({ endYear: 2035 });
      expect(calculateYearlyExpense(bounded, 2036, basePlan, SAMPLE_YEAR)).toBe(0);
    });

    it('compounds currentAnnual from the sample year', () => {
      const expense = generalExpense({ currentAnnual: 100_000, growthRate: 2 });
      const atStart = calculateYearlyExpense(expense, expense.startYear, basePlan, SAMPLE_YEAR);
      expect(atStart).toBeCloseTo(100_000 * Math.pow(1.02, expense.startYear - SAMPLE_YEAR), 0);

      const twoYearsLater = calculateYearlyExpense(expense, expense.startYear + 2, basePlan, SAMPLE_YEAR);
      expect(twoYearsLater).toBeCloseTo(
        100_000 * Math.pow(1.02, expense.startYear + 2 - SAMPLE_YEAR),
        0,
      );
    });

    it('falls back to plan inflation when growthRate is unset', () => {
      const expense = generalExpense({ growthRate: undefined, startYear: SAMPLE_YEAR + 1 });
      const result = calculateYearlyExpense(expense, SAMPLE_YEAR + 2, basePlan, SAMPLE_YEAR);
      expect(result).toBeCloseTo(100_000 * Math.pow(1.02, 2), 0);
    });

    it('applies the retirement multiplier immediately in the retirement year', () => {
      const expense = generalExpense({ currentAnnual: 100_000, growthRate: 0, retirementMultiplier: 0.7 });

      const lastWorkingYear = calculateYearlyExpense(expense, 2044, basePlan, SAMPLE_YEAR);
      expect(lastWorkingYear).toBeCloseTo(100_000, 0);

      const firstRetirementYear = calculateYearlyExpense(expense, 2045, basePlan, SAMPLE_YEAR);
      expect(firstRetirementYear).toBeCloseTo(100_000 * 0.7, 0);

      const laterRetirementYear = calculateYearlyExpense(expense, 2047, basePlan, SAMPLE_YEAR);
      expect(laterRetirementYear).toBeCloseTo(100_000 * 0.7, 0);
    });

    it('treats unset endYear as lifelong for general expenses', () => {
      const expense = generalExpense({ endYear: null });
      expect(calculateYearlyExpense(expense, 2069, basePlan, SAMPLE_YEAR)).toBeGreaterThan(0);
      expect(calculateYearlyExpense(expense, 2071, basePlan, SAMPLE_YEAR)).toBe(0);
    });

    describe('debt_payment', () => {
      it('uses the compounded current level like a general expense', () => {
        const expense = debtPaymentExpense({ currentAnnual: 240_000, growthRate: 0 });
        expect(calculateYearlyExpense(expense, 2030, basePlan, SAMPLE_YEAR)).toBeCloseTo(240_000, 0);
      });

      it('interest-only uses the sampled monthly interest annualized', () => {
        const expense = debtPaymentExpense({
          interestOnly: true,
          calculatedFrom: {
            debtAccountId: 'debt-1',
            interestPaid: 120_000,
            sampleCount: 12,
          },
        });
        expect(calculateYearlyExpense(expense, 2030, basePlan, SAMPLE_YEAR)).toBeCloseTo(120_000, 0);
      });

      it('ignores the retirement multiplier', () => {
        const expense = debtPaymentExpense({ retirementMultiplier: 0.5, growthRate: 0 });
        expect(calculateYearlyExpense(expense, 2035, basePlan, SAMPLE_YEAR)).toBeCloseTo(240_000, 0);
      });
    });
  });
});
