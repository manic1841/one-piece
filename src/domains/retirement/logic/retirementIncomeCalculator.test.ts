import { describe, expect, it } from 'vitest';

import {
  calculateTotalYearlyIncome,
  calculateYearlyIncome,
  calculateYearlyIncomes,
  filterActiveIncomes,
} from '@/domains/retirement/logic/retirementIncomeCalculator';
import type { RetirementIncomeSource } from '@/domains/retirement/types';

describe('retirementIncomeCalculator', () => {
  // Sample year anchor: 2023. currentAnnual reflects 2023 actuals.
  const SAMPLE_YEAR = 2023;
  const RETIREMENT_YEAR = 2045;
  const INFLATION = 2;

  const salary: RetirementIncomeSource = {
    id: 'salary-1',
    name: 'Monthly Salary',
    type: 'salary',
    importedFrom: 'manual',
    autoUpdate: false,
    startYearMode: 'MANUAL',
    endYearMode: 'MANUAL',
    lifelong: false,
    currentAnnual: 48_000,
    growthRate: 3,
    startYear: 2025,
    endYear: 2030,
  };

  const importedSalary: RetirementIncomeSource = {
    ...salary,
    id: 'imported-1',
    name: 'Imported Salary',
    importedFrom: 'transactionEntries',
    currentAnnual: 60_000,
    calculatedFrom: {
      ledgerCode: 'income:salary',
      sampleYear: SAMPLE_YEAR,
      totalAmount: 60_000,
      monthlyAverage: 5_000,
      sampleCount: 12,
      importedAt: '2024-01-01T00:00:00.000Z',
    },
  };

  describe('calculateYearlyIncome', () => {
    it('compounds currentAnnual from the sample year for working years', () => {
      const atSample = calculateYearlyIncome(
        salary,
        SAMPLE_YEAR,
        RETIREMENT_YEAR,
        INFLATION,
        SAMPLE_YEAR,
      );
      expect(atSample).toBeCloseTo(48_000, 0);

      const twoYearsLater = calculateYearlyIncome(
        salary,
        SAMPLE_YEAR + 2,
        RETIREMENT_YEAR,
        INFLATION,
        SAMPLE_YEAR,
      );
      expect(twoYearsLater).toBeCloseTo(48_000 * 1.03 * 1.03, 0);
    });

    it('falls back to plan inflation when growthRate is unset', () => {
      const noGrowth: RetirementIncomeSource = { ...salary, growthRate: undefined };
      const result = calculateYearlyIncome(
        noGrowth,
        SAMPLE_YEAR + 1,
        RETIREMENT_YEAR,
        INFLATION,
        SAMPLE_YEAR,
      );
      expect(result).toBeCloseTo(48_000 * 1.02, 0);
    });

    it('uses retirementAnnual anchored at retirement year from retirement onward', () => {
      const withRetirement: RetirementIncomeSource = { ...salary, retirementAnnual: 30_000 };
      const atRetirement = calculateYearlyIncome(
        withRetirement,
        RETIREMENT_YEAR,
        RETIREMENT_YEAR,
        INFLATION,
        SAMPLE_YEAR,
      );
      expect(atRetirement).toBeCloseTo(30_000, 0);

      const fiveYearsAfter = calculateYearlyIncome(
        withRetirement,
        RETIREMENT_YEAR + 5,
        RETIREMENT_YEAR,
        INFLATION,
        SAMPLE_YEAR,
      );
      // growthRate 3% compounding from the retirement anchor
      expect(fiveYearsAfter).toBeCloseTo(30_000 * Math.pow(1.03, 5), 0);
    });

    it('continues the current level in retirement when retirementAnnual is unset', () => {
      const atRetirement = calculateYearlyIncome(
        salary,
        RETIREMENT_YEAR,
        RETIREMENT_YEAR,
        INFLATION,
        SAMPLE_YEAR,
      );
      const expected = 48_000 * Math.pow(1.03, RETIREMENT_YEAR - SAMPLE_YEAR);
      expect(atRetirement).toBeCloseTo(expected, 0);
    });

    it('anchors retirementAnnual at startYear for streams starting at/after retirement', () => {
      const latePension: RetirementIncomeSource = {
        ...salary,
        id: 'pension-late',
        type: 'pension',
        currentAnnual: 0,
        growthRate: undefined,
        startYear: 2050,
        endYear: undefined,
        lifelong: true,
        retirementAnnual: 20_000,
      };
      const atStart = calculateYearlyIncome(
        latePension,
        2050,
        RETIREMENT_YEAR,
        INFLATION,
        SAMPLE_YEAR,
      );
      expect(atStart).toBeCloseTo(20_000, 0);

      const fiveYearsIn = calculateYearlyIncome(
        latePension,
        2055,
        RETIREMENT_YEAR,
        INFLATION,
        SAMPLE_YEAR,
      );
      // no growthRate: falls back to plan inflation 2%
      expect(fiveYearsIn).toBeCloseTo(20_000 * Math.pow(1.02, 5), 0);
    });
  });

  describe('calculateYearlyIncomes', () => {
    it('builds a map for all income sources', () => {
      const result = calculateYearlyIncomes(
        [salary, importedSalary],
        SAMPLE_YEAR,
        RETIREMENT_YEAR,
        INFLATION,
        SAMPLE_YEAR,
      );
      expect(result.get('salary-1')).toBeCloseTo(48_000, 0);
      expect(result.get('imported-1')).toBeCloseTo(60_000, 0);
    });
  });

  describe('calculateTotalYearlyIncome', () => {
    it('sums all income sources for the year', () => {
      const total = calculateTotalYearlyIncome(
        [salary, importedSalary],
        SAMPLE_YEAR,
        RETIREMENT_YEAR,
        INFLATION,
        SAMPLE_YEAR,
      );
      expect(total).toBeCloseTo(108_000, 0);
    });
  });

  describe('filterActiveIncomes', () => {
    it('filters incomes by active year range', () => {
      const earlyIncome: RetirementIncomeSource = {
        ...salary,
        id: 'early',
        startYear: 2020,
        endYear: 2024,
      };

      const active = filterActiveIncomes([salary, earlyIncome, importedSalary], 2025);
      expect(active).toHaveLength(2);
      expect(active.map((income) => income.id)).toContain('salary-1');
      expect(active.map((income) => income.id)).toContain('imported-1');
      expect(active.map((income) => income.id)).not.toContain('early');
    });

    it('honors linked retirement year and lifelong settings', () => {
      const linkedPension: RetirementIncomeSource = {
        ...salary,
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
