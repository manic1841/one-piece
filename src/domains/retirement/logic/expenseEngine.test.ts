import { describe, expect, it } from 'vitest';

import { CalculationMode, RetirementExpenseType, SalaryPercentageRetirementMode } from '../schemas';
import type { RetirementExpenseCategory, RetirementPlan } from '../types';
import { calculateYearlyExpense } from './expenseEngine';

// ─── Shared test plan ─────────────────────────────────────────────────────────
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
  currentSavings: 0,
  salaryGrowthRate: 3,
  inflationRate: 2,
  investmentReturnRate: 5,
  incomes: [],
  expenses: [],
  events: [],
};

const emptyIncomes = new Map<string, number>();

// ─── Helper to build a FIXED expense ─────────────────────────────────────────
function fixedExpense(overrides: Partial<RetirementExpenseCategory>): RetirementExpenseCategory {
  return {
    id: 'e1',
    name: 'Expense',
    type: RetirementExpenseType.GENERAL,
    includesPrincipal: false,
    interestOnly: false,
    calculationMode: CalculationMode.FIXED,
    baseAmount: 100_000,
    growthRate: 2,
    retirementMultiplier: 0.7,
    startYear: 2025,
    endYear: null,
    ...overrides,
  };
}

// ─── Helper to build a SALARY_PERCENTAGE expense ──────────────────────────────
function salaryExpense(overrides: Partial<RetirementExpenseCategory>): RetirementExpenseCategory {
  return {
    id: 'e2',
    name: 'Living',
    type: RetirementExpenseType.GENERAL,
    includesPrincipal: false,
    interestOnly: false,
    calculationMode: CalculationMode.SALARY_PERCENTAGE,
    baseAmount: 0,
    growthRate: 2,
    retirementMultiplier: 1,
    salaryPercentage: 0.35,
    fallbackAmount: 300_000,
    startYear: 2025,
    endYear: null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('expenseEngine — calculateYearlyExpense', () => {
  // ── 1. FIXED mode: compound inflation ─────────────────────────────────────
  describe('FIXED mode', () => {
    it('returns baseAmount in the currentYear (year 0 growth)', () => {
      const result = calculateYearlyExpense(fixedExpense({}), 2025, basePlan, emptyIncomes, 0);
      expect(result).toBeCloseTo(100_000, 0);
    });

    it('compounds inflation over 30 years (working years)', () => {
      // year 2055, but retirement is 2045 — still retired, but let's only check pre-retirement
      // year 2044 = 1 year before retirement, 19 years of growth
      const result = calculateYearlyExpense(fixedExpense({}), 2044, basePlan, emptyIncomes, 0);
      const expected = 100_000 * Math.pow(1.02, 19);
      expect(result).toBeCloseTo(expected, 0);
    });

    it('applies retirementMultiplier immediately in retirement year (IMMEDIATE)', () => {
      // retirementYear = 2045, years from start = 20
      const result = calculateYearlyExpense(fixedExpense({}), 2045, basePlan, emptyIncomes, 0);
      const expected = 100_000 * Math.pow(1.02, 20) * 0.7;
      expect(result).toBeCloseTo(expected, 0);
    });

    it('continues to inflate at retirementMultiplier level post-retirement', () => {
      // year 2055 = 10 years after retirement, 30 years of growth from 2025
      const result = calculateYearlyExpense(fixedExpense({}), 2055, basePlan, emptyIncomes, 0);
      const expected = 100_000 * Math.pow(1.02, 30) * 0.7;
      expect(result).toBeCloseTo(expected, 0);
    });

    it('returns 0 before startYear', () => {
      const result = calculateYearlyExpense(
        fixedExpense({ startYear: 2030 }),
        2028,
        basePlan,
        emptyIncomes,
        0,
      );
      expect(result).toBe(0);
    });

    it('returns 0 after endYear', () => {
      const result = calculateYearlyExpense(
        fixedExpense({ endYear: 2035 }),
        2036,
        basePlan,
        emptyIncomes,
        0,
      );
      expect(result).toBe(0);
    });
  });

  // ── 2. FIXED mode: gradual retirement transition ───────────────────────────
  describe('FIXED mode — gradual transition', () => {
    const planWithGradual: RetirementPlan = {
      ...basePlan,
      retirementTransition: { mode: 'GRADUAL', transitionYears: 5 },
    };
    // retirementMultiplier = 0.7, transitionYears = 5
    // reductionPerYear = (1 - 0.7) / 5 = 0.06
    // year n (1-indexed): effectiveMultiplier = 1.0 - 0.06 * n

    it('applies partial multiplier in year 1 of retirement', () => {
      // year = 2045 (retirement year, n=1): multiplier = 1 - 0.06*1 = 0.94
      const inflated = 100_000 * Math.pow(1.02, 20); // 20 years from 2025
      const result = calculateYearlyExpense(
        fixedExpense({}),
        2045,
        planWithGradual,
        emptyIncomes,
        0,
      );
      expect(result).toBeCloseTo(inflated * 0.94, 0);
    });

    it('reaches full retirementMultiplier by last transition year', () => {
      // year = 2049 (n=5 => capped at retirementMultiplier = 0.7)
      const inflated = 100_000 * Math.pow(1.02, 24);
      const result = calculateYearlyExpense(
        fixedExpense({}),
        2049,
        planWithGradual,
        emptyIncomes,
        0,
      );
      expect(result).toBeCloseTo(inflated * 0.7, 0);
    });

    it('stays at retirementMultiplier after transition period ends', () => {
      // year = 2055 (n=11, beyond transitionYears=5)
      const inflated = 100_000 * Math.pow(1.02, 30);
      const result = calculateYearlyExpense(
        fixedExpense({}),
        2055,
        planWithGradual,
        emptyIncomes,
        0,
      );
      expect(result).toBeCloseTo(inflated * 0.7, 0);
    });
  });

  // ── 3. SALARY_PERCENTAGE mode ─────────────────────────────────────────────
  describe('SALARY_PERCENTAGE mode', () => {
    it('returns salary * percentage in working years', () => {
      const incomes = new Map([['income1', 1_000_000]]);
      const expense = salaryExpense({ linkedIncomeId: 'income1' });
      const result = calculateYearlyExpense(expense, 2025, basePlan, incomes, 1_000_000);
      expect(result).toBeCloseTo(350_000, 0); // 1M * 0.35
    });

    it('uses totalSalary when linkedIncomeId is absent', () => {
      const expense = salaryExpense({ linkedIncomeId: undefined });
      const result = calculateYearlyExpense(expense, 2025, basePlan, emptyIncomes, 1_200_000);
      expect(result).toBeCloseTo(420_000, 0); // 1.2M * 0.35
    });

    it('falls back to fallbackAmount on retirement (first year, no growth)', () => {
      // retirement year = 2045, yearsFromRetirement = 0
      const expense = salaryExpense({ fallbackAmount: 300_000, growthRate: 2 });
      const result = calculateYearlyExpense(expense, 2045, basePlan, emptyIncomes, 0);
      expect(result).toBeCloseTo(300_000, 0); // 300k * 1.02^0
    });

    it('inflates fallbackAmount from retirement year onward', () => {
      // year 2047 = 2 years after retirement
      const expense = salaryExpense({ fallbackAmount: 300_000, growthRate: 2 });
      const result = calculateYearlyExpense(expense, 2047, basePlan, emptyIncomes, 0);
      const expected = 300_000 * Math.pow(1.02, 2);
      expect(result).toBeCloseTo(expected, 0);
    });

    it('falls back to (baseAmount * retirementMultiplier) when fallbackAmount is absent', () => {
      const expense = salaryExpense({
        fallbackAmount: undefined,
        baseAmount: 500_000,
        retirementMultiplier: 0.6,
      });
      const result = calculateYearlyExpense(expense, 2045, basePlan, emptyIncomes, 0);
      expect(result).toBeCloseTo(300_000, 0); // 500k * 0.6 * 1^0
    });

    it('uses inflation-based retirement mode by deriving retirement base from salary-percentage', () => {
      const expense = salaryExpense({
        salaryPercentageRetirementMode: SalaryPercentageRetirementMode.INFLATION_BASED,
        salaryPercentage: 0.25,
        growthRate: 2,
      });

      // retirement year with total salary = 1,200,000 -> base = 300,000
      const retirementYearAmount = calculateYearlyExpense(
        expense,
        2045,
        basePlan,
        emptyIncomes,
        1_200_000,
      );
      expect(retirementYearAmount).toBeCloseTo(300_000, 0);

      // 2 years after retirement -> base * 1.02^2
      const afterRetirementAmount = calculateYearlyExpense(
        expense,
        2047,
        basePlan,
        emptyIncomes,
        1_200_000,
      );
      expect(afterRetirementAmount).toBeCloseTo(300_000 * Math.pow(1.02, 2), 0);
    });

    it('inflates baseAmount when inflation-based retirement mode has no salary to derive from', () => {
      const expense = salaryExpense({
        salaryPercentageRetirementMode: SalaryPercentageRetirementMode.INFLATION_BASED,
        salaryPercentage: 0.25,
        fallbackAmount: undefined,
        baseAmount: 180_000,
        growthRate: 3,
      });

      const result = calculateYearlyExpense(expense, 2046, basePlan, emptyIncomes, 0);
      expect(result).toBeCloseTo(180_000 * Math.pow(1.03, 1), 0);
    });

    it('keeps growing by inflation after retirement even when linked income becomes zero', () => {
      const planWithLinkedIncome: RetirementPlan = {
        ...basePlan,
        incomes: [
          {
            id: 'income1',
            name: 'Main Salary',
            importedFrom: 'manual',
            type: 'salary',
            baseAmount: 1_000_000,
            growthRate: 2,
            startYear: 2025,
            endYear: 2046,
          },
        ],
      };

      const expense = salaryExpense({
        linkedIncomeId: 'income1',
        salaryPercentage: 0.3,
        growthRate: 2,
        salaryPercentageRetirementMode: SalaryPercentageRetirementMode.INFLATION_BASED,
      });

      // 2045 is retirement year, linked salary still exists.
      const retirementBase = 1_000_000 * Math.pow(1.02, 20) * 0.3;

      // 2050 is after linked income has ended (endYear 2046), but expense should NOT be zero.
      const result2050 = calculateYearlyExpense(
        expense,
        2050,
        planWithLinkedIncome,
        emptyIncomes,
        0,
      );
      expect(result2050).toBeCloseTo(retirementBase * Math.pow(1.02, 5), 0);
    });

    it('falls back to fixed inflation when linked income ends (returns 0)', () => {
      // linked income not in map → linkedAmount = 0 → use fallbackAmount * growthFactor
      const incomes = new Map<string, number>(); // income1 not present
      const expense = salaryExpense({
        linkedIncomeId: 'income1',
        fallbackAmount: 200_000,
        growthRate: 2,
      });
      const result = calculateYearlyExpense(expense, 2030, basePlan, incomes, 0);
      const expected = 200_000 * Math.pow(1.02, 5); // 5 years from 2025
      expect(result).toBeCloseTo(expected, 0);
    });
  });

  // ── 4. DEBT_PAYMENT mode ──────────────────────────────────────────────────
  describe('DEBT_PAYMENT mode', () => {
    it('uses fixed annual repayment amount when includesPrincipal=true', () => {
      const debtExpense = fixedExpense({
        type: RetirementExpenseType.DEBT_PAYMENT,
        includesPrincipal: true,
        interestOnly: false,
        baseAmount: 360_000,
      });

      const result = calculateYearlyExpense(debtExpense, 2025, basePlan, emptyIncomes, 0);
      expect(result).toBeCloseTo(360_000, 0);
    });

    it('uses annualized snapshot interest when interestOnly=true', () => {
      const debtExpense = fixedExpense({
        type: RetirementExpenseType.DEBT_PAYMENT,
        includesPrincipal: false,
        interestOnly: true,
        calculatedFrom: {
          debtAccountId: 'd1',
          sampleStartYearMonth: '2025-01',
          sampleEndYearMonth: '2025-12',
          interestPaid: 120_000,
          totalPaid: 360_000,
          sampleCount: 12,
          importedAt: new Date().toISOString(),
        },
      });

      const result = calculateYearlyExpense(debtExpense, 2025, basePlan, emptyIncomes, 0);
      expect(result).toBeCloseTo(120_000, 0);
    });
  });

  // ── 5. Backward compatibility: legacy percentOfSalary ─────────────────────
  describe('backward compatibility (legacy percentOfSalary)', () => {
    it('treats FIXED mode + percentOfSalary > 0 as SALARY_PERCENTAGE working years', () => {
      // Simulates Firestore document written before calculationMode was introduced
      const legacy = {
        id: 'e_legacy',
        name: 'Legacy',
        baseAmount: 100_000,
        growthRate: 2,
        retirementMultiplier: 0.7,
        startYear: 2025,
        endYear: null,
        percentOfSalary: 30, // legacy: 30%
        // calculationMode absent — engine must fall back to SALARY_PERCENTAGE
      } as unknown as RetirementExpenseCategory;
      const result = calculateYearlyExpense(legacy, 2025, basePlan, emptyIncomes, 1_000_000);
      expect(result).toBeCloseTo(300_000, 0); // 1M * 30%
    });
  });

  // ── 6. Combined expenses (integration-style) ──────────────────────────────
  describe('combined FIXED + SALARY_PERCENTAGE totals', () => {
    it('sums correctly in a working year', () => {
      // Fixed mortgage: 200k/yr
      // SALARY_PERCENTAGE living: 35% of 1M salary = 350k
      const mortgage = fixedExpense({ baseAmount: 200_000, retirementMultiplier: 0.5 });
      const living = salaryExpense({});
      const incomes = new Map([['s1', 1_000_000]]);

      const totalExpense =
        calculateYearlyExpense(mortgage, 2025, basePlan, incomes, 1_000_000) +
        calculateYearlyExpense(living, 2025, basePlan, incomes, 1_000_000);

      expect(totalExpense).toBeCloseTo(550_000, 0);
    });

    it('sums correctly in a retirement year (immediate transition)', () => {
      // Mortgage: 200k * 1.02^20 * 0.5
      // Living fallback: 300k * 1 (first retirement year)
      const mortgage = fixedExpense({ baseAmount: 200_000, retirementMultiplier: 0.5 });
      const living = salaryExpense({ fallbackAmount: 300_000 });

      const mortgageResult = calculateYearlyExpense(mortgage, 2045, basePlan, emptyIncomes, 0);
      const livingResult = calculateYearlyExpense(living, 2045, basePlan, emptyIncomes, 0);

      const expectedMortgage = 200_000 * Math.pow(1.02, 20) * 0.5;
      expect(mortgageResult).toBeCloseTo(expectedMortgage, 0);
      expect(livingResult).toBeCloseTo(300_000, 0);
    });
  });
});
