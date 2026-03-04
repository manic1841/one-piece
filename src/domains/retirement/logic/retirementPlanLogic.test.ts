import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import { AssetSubCategory, IncomeSubCategory } from '@/domains/finance/types/categories';
import { type RetirementPlan } from '@/domains/retirement/types';
import { RetirementIncomeType } from '@/domains/retirement/types/categories';

import {
  calculateExpenseSuggestion,
  calculateIncomeImportMetadata,
  calculateIncomeSourceSuggestions,
  processAutoUpdate,
} from './retirementPlanLogic';

describe('retirementPlanLogic', () => {
  describe('calculateExpenseSuggestion', () => {
    const project = { id: 'p1', name: 'Household' };

    it('should calculate annualized expense correctly', () => {
      const snapshots = [{ expense: 1000 } as any, { expense: 2000 } as any];
      const result = calculateExpenseSuggestion(project, snapshots);

      expect(result).not.toBeNull();
      // Average 1500 * 12 = 18000
      expect(result?.baseAmount).toBe(18000);
      expect(result?.name).toBe('Household');
      expect(result?.sourceProjectId).toBe('p1');
    });

    it('should return null if snapshots are empty', () => {
      const result = calculateExpenseSuggestion(project, []);
      expect(result).toBeNull();
    });

    it('should return null if annualized amount is 0', () => {
      const snapshots = [{ expense: 0 } as any];
      const result = calculateExpenseSuggestion(project, snapshots);
      expect(result).toBeNull();
    });
  });

  describe('calculateIncomeSourceSuggestions', () => {
    it('should group and calculate income sources from planned incomes', () => {
      const now = new Date();
      const plannedIncomes = [
        { category: 'salary', amount: 50000, date: now } as any,
        { category: 'salary', amount: 50000, date: now } as any,
        { category: 'bonus', amount: 10000, date: now } as any,
      ];
      const referenceMonths = 12;
      const result = calculateIncomeSourceSuggestions(plannedIncomes, referenceMonths);

      expect(result).toHaveLength(2);

      const salary = result.find((r) => r.incomeCategory === 'salary');
      expect(salary).toBeDefined();
      // (100000 / 12) * 12 = 100000
      expect(salary?.baseAmount).toBe(100000);
      expect(salary?.calculatedFrom?.sampleCount).toBe(2);
    });
  });

  describe('calculateIncomeImportMetadata', () => {
    it('should calculate metadata correctly', () => {
      const d1 = new Date(Date.UTC(2025, 0, 1));
      const d2 = new Date(Date.UTC(2025, 1, 1));
      const validIncomes = [
        { amount: 1000, date: Timestamp.fromDate(d1) } as any,
        { amount: 2000, date: Timestamp.fromDate(d2) } as any,
      ];
      const result = calculateIncomeImportMetadata(validIncomes);

      expect(result).not.toBeNull();
      expect(result?.totalAmount).toBe(3000);
      expect(result?.monthlyAverage).toBe(1500);
      expect(result?.sampleCount).toBe(2);
      expect(result?.startDate).toBe('2025-01-01');
      expect(result?.endDate).toBe('2025-02-01');
    });

    it('should return null if no incomes', () => {
      expect(calculateIncomeImportMetadata([])).toBeNull();
    });
  });

  describe('processAutoUpdate', () => {
    const plan: RetirementPlan = {
      id: 'plan-1',
      currentSavings: 10000,
      currentYear: 2024,
      incomes: [
        {
          id: 'i1',
          type: RetirementIncomeType.SALARY,
          baseAmount: 120000,
          calculatedFrom: { sampleCount: 12 },
        } as any,
      ],
    } as any;

    const reports = [
      {
        type: 'balance_sheet',
        year: 2025,
        month: 1,
        data: {
          assets: {
            items: [
              { category: AssetSubCategory.CASH, amount: 20000 },
              { category: AssetSubCategory.INVESTMENTS, amount: 30000 },
              { category: AssetSubCategory.OTHERS, amount: 10000 },
            ],
          },
        },
      } as any,
      {
        type: 'income_statement',
        year: 2025,
        month: 1,
        data: {
          revenue: {
            items: [{ category: IncomeSubCategory.SALARY, amount: 10000 }],
          },
        },
      } as any,
    ];

    const latestPeriod = { year: 2025, month: 1 };

    it('should calculate correct updates from reports', () => {
      const result = processAutoUpdate(plan, reports, latestPeriod);

      expect(result.currentYear).toBe(2025);
      // Liquid assets: 20000 + 30000 = 50000
      expect(result.currentSavings).toBe(50000);

      // Salary: avg is 10000 (only 1 report provided but logic divides by 12)
      // Actually the mock has 1 IS report with 10k. totalSalary = 10k. monthlySalaryAvg = 10k/12.
      // Wait, the logic in processAutoUpdate does: totalSalary / 12.
      // So if I only have 1 report with 10k, avg is 10k/12.
      // annualBase = (10000/12) * 12 = 10000.
      expect(result.incomes[0].baseAmount).toBe(10000);
    });
  });
});
