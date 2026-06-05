import { describe, expect, it } from 'vitest';

import {
  calculateTotalYearlyIncome,
  calculateYearlyIncome,
  calculateYearlyIncomes,
  filterActiveIncomes,
} from '@/domains/retirement/logic/retirementIncomeCalculator';
import type { RetirementIncomeSource } from '@/domains/retirement/types';

describe('retirementIncomeCalculator', () => {
  const baseIncome: RetirementIncomeSource = {
    id: 'salary-1',
    name: 'Monthly Salary',
    type: 'salary',
    importedFrom: 'manual',
    incomeCalculationMode: 'FIXED',
    baseAmount: 48000,
    growthRate: 3,
    startYear: 2025,
    endYear: 2030,
  };

  const derivedIncome: RetirementIncomeSource = {
    id: 'bonus-1',
    name: 'Year-end Bonus',
    type: 'bonus',
    importedFrom: 'manual',
    incomeCalculationMode: 'DERIVED',
    baseAmount: 0,
    growthRate: 0,
    startYear: 2025,
    endYear: 2030,
    derivedFrom: {
      baseIncomeId: 'salary-1',
      multiplier: 1.67,
    },
  };

  const chainedDerivedIncome: RetirementIncomeSource = {
    id: 'allowance-1',
    name: 'Allowance',
    type: 'other',
    importedFrom: 'manual',
    incomeCalculationMode: 'DERIVED',
    baseAmount: 0,
    growthRate: 0,
    startYear: 2025,
    endYear: 2030,
    derivedFrom: {
      baseIncomeId: 'bonus-1',
      multiplier: 0.5,
    },
  };

  describe('calculateYearlyIncome', () => {
    it('should calculate fixed income with growth rate', () => {
      const year0 = calculateYearlyIncome(baseIncome, 0);
      expect(year0).toBeCloseTo(48000, 0);

      const year1 = calculateYearlyIncome(baseIncome, 1);
      expect(year1).toBeCloseTo(48000 * 1.03, 0);

      const year2 = calculateYearlyIncome(baseIncome, 2);
      expect(year2).toBeCloseTo(48000 * 1.03 * 1.03, 0);
    });

    it('should calculate derived income as base * multiplier', () => {
      const baseYearlyIncomes = new Map([['salary-1', 48000]]);
      const derived = calculateYearlyIncome(derivedIncome, 0, baseYearlyIncomes);
      expect(derived).toBeCloseTo(48000 * 1.67, 0);
    });
  });

  describe('calculateYearlyIncomes', () => {
    it('should calculate all incomes in dependency order', () => {
      const incomes = [baseIncome, derivedIncome];
      const result = calculateYearlyIncomes(incomes, 2025, 2025);

      expect(result.get('salary-1')).toBeCloseTo(48000, 0);
      expect(result.get('bonus-1')).toBeCloseTo(48000 * 1.67, 0);
    });

    it('should apply growth rate to derived base income correctly', () => {
      const incomes = [baseIncome, derivedIncome];
      const result = calculateYearlyIncomes(incomes, 2026, 2025);

      // Salary year 1: 48000 * 1.03
      expect(result.get('salary-1')).toBeCloseTo(48000 * 1.03, 0);
      // Bonus year 1: (48000 * 1.03) * 1.67
      expect(result.get('bonus-1')).toBeCloseTo(48000 * 1.03 * 1.67, 0);
    });

    it('should support multi-layer derived dependencies (A->B->C)', () => {
      const incomes = [baseIncome, derivedIncome, chainedDerivedIncome];
      const result = calculateYearlyIncomes(incomes, 2025, 2025);

      const bonus = 48000 * 1.67;
      expect(result.get('bonus-1')).toBeCloseTo(bonus, 0);
      expect(result.get('allowance-1')).toBeCloseTo(bonus * 0.5, 0);
    });
  });

  describe('calculateTotalYearlyIncome', () => {
    it('should sum all active incomes', () => {
      const incomes = [baseIncome, derivedIncome];
      const total = calculateTotalYearlyIncome(incomes, 2025, 2025);

      const expected = 48000 + 48000 * 1.67;
      expect(total).toBeCloseTo(expected, 0);
    });
  });

  describe('filterActiveIncomes', () => {
    it('should filter incomes by active year range', () => {
      const earlyIncome: RetirementIncomeSource = {
        ...baseIncome,
        id: 'early',
        startYear: 2020,
        endYear: 2024,
      };

      const incomes = [baseIncome, earlyIncome, derivedIncome];
      const active = filterActiveIncomes(incomes, 2025);

      expect(active).toHaveLength(2);
      expect(active.map((i) => i.id)).toContain('salary-1');
      expect(active.map((i) => i.id)).toContain('bonus-1');
      expect(active.map((i) => i.id)).not.toContain('early');
    });

    it('should honor linked retirement year and lifelong settings', () => {
      const linkedPension: RetirementIncomeSource = {
        ...baseIncome,
        id: 'pension-linked',
        type: 'pension',
        startYearMode: 'LINKED_TO_RETIREMENT',
        endYearMode: 'MANUAL',
        lifelong: true,
        startYear: 2030,
      };

      const activeAtRetirement = filterActiveIncomes([linkedPension], 2055, 2055, 2080);
      expect(activeAtRetirement).toHaveLength(1);

      const beforeRetirement = filterActiveIncomes([linkedPension], 2054, 2055, 2080);
      expect(beforeRetirement).toHaveLength(0);
    });
  });
});
