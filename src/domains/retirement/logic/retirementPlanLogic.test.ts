import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import type { ProjectSnapshot } from '../../project/schemas';

import { ReportType } from '../../report/schemas';
import { RetirementIncomeType, type RetirementPlan } from '../types';
import {
  calculateExpenseSuggestion,
  calculateIncomeImportMetadata,
  calculateIncomeSourceSuggestions,
  processAutoUpdate,
  type PlannedIncome,
} from './retirementPlanLogic';

describe('retirementPlanLogic', () => {
  describe('calculateExpenseSuggestion', () => {
    const project = { id: 'p1', name: 'Household' };

    it('should calculate annualized expense correctly', () => {
      const snapshots = [{ expense: 1000 } as unknown as ProjectSnapshot, { expense: 2000 } as unknown as ProjectSnapshot];
      const result = calculateExpenseSuggestion(project, snapshots);

      expect(result).not.toBeNull();
      // Average 1500 * 12 = 18000
      expect(result?.baseAmount).toBe(18000);
      expect(result?.name).toBe('Household');
      expect(result?.sourceProjectId).toBe('p1');
      expect(result?.retirementMultiplier).toBe(0.7);
    });

    it('should return null if snapshots are empty', () => {
      const result = calculateExpenseSuggestion(project, []);
      expect(result).toBeNull();
    });

    it('should return null if annualized amount is 0', () => {
      const snapshots = [{ expense: 0 } as unknown as ProjectSnapshot];
      const result = calculateExpenseSuggestion(project, snapshots);
      expect(result).toBeNull();
    });
  });

  describe('calculateIncomeSourceSuggestions', () => {
    it('should group and calculate income sources from planned incomes', () => {
      const now = new Date();
      const plannedIncomes = [
        { category: 'salary', amount: 50000, date: now } as PlannedIncome,
        { category: 'salary', amount: 50000, date: now } as PlannedIncome,
        { category: 'bonus', amount: 10000, date: now } as PlannedIncome,
      ];
      const referenceMonths = 12;
      const result = calculateIncomeSourceSuggestions(plannedIncomes, referenceMonths);

      expect(result).toHaveLength(2);

      const salary = result.find((r) => r.incomeCategory === 'salary');
      expect(salary).toBeDefined();
      // (100000 / 12) * 12 = 100000
      expect(salary?.baseAmount).toBe(100000);
      expect(salary?.calculatedFrom?.sampleCount).toBe(2);
      expect(salary?.importedFrom).toBe('plannedIncome');
    });
  });

  describe('calculateIncomeImportMetadata', () => {
    it('should calculate metadata correctly', () => {
      const d1 = new Date(Date.UTC(2025, 0, 1));
      const d2 = new Date(Date.UTC(2025, 1, 1));
      const validIncomes = [
        { amount: 1000, date: Timestamp.fromDate(d1) } as unknown as PlannedIncome,
        { amount: 2000, date: Timestamp.fromDate(d2) } as unknown as PlannedIncome,
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
    const plan = {
      id: 'plan-1',
      householdId: 'household-1',
      name: 'Plan',
      isActive: true,
      autoUpdate: true,
      createdBy: 'u1',
      updatedBy: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
      currentSavings: 10000,
      currentYear: 2024,
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 90,
      salaryGrowthRate: 3,
      inflationRate: 2,
      investmentReturnRate: 5,
      incomes: [
        {
          id: 'i1',
          type: RetirementIncomeType.SALARY,
          baseAmount: 120000,
          name: 'Salary',
          importedFrom: 'manual',
          growthRate: 3,
          startYear: 2024,
          endYear: 2060,
          calculatedFrom: { sampleCount: 12 },
        } as unknown,
      ],
      expenses: [],
      events: [],
    } as unknown as RetirementPlan;

    const reports = [
      {
        type: ReportType.BALANCE_SHEET,
        yearMonth: '2025-01',
        data: {
          assets: {
            total: 50000,
          },
        },
      } as unknown,
      {
        type: ReportType.INCOME_STATEMENT,
        yearMonth: '2025-01',
        data: {
          incomeItems: [{ code: 'salary.base', amount: 10000 }],
        },
      } as unknown,
    ];

    const latestPeriod = { year: 2025, month: 1 };

    it('should calculate correct updates from reports', () => {
      const result = processAutoUpdate(plan, reports, latestPeriod);

      expect(result.currentYear).toBe(2025);
      expect(result.currentSavings).toBe(50000);

      expect(result.incomes[0].baseAmount).toBe(120000);
    });

    it('should keep existing savings when matching balance sheet is missing', () => {
      const result = processAutoUpdate(plan, [], latestPeriod);

      expect(result.currentYear).toBe(2025);
      expect(result.currentSavings).toBe(10000);
    });
  });
});
