import { describe, expect, it } from 'vitest';

import {
  type PlannedIncome,
  calculateIncomeImportMetadata,
  calculateIncomeSourceSuggestions,
} from './retirementPlanLogic';

describe('retirementPlanLogic', () => {
  describe('calculateIncomeSourceSuggestions', () => {
    it('should group and calculate income sources from ledger-code income entries', () => {
      const now = new Date();
      const plannedIncomes = [
        { ledgerCode: 'income:salary:charles', amount: 50000, date: now } as PlannedIncome,
        { ledgerCode: 'income:salary:charles', amount: 50000, date: now } as PlannedIncome,
        { ledgerCode: 'income:bonus:charles', amount: 10000, date: now } as PlannedIncome,
      ];
      const referenceMonths = 12;
      const result = calculateIncomeSourceSuggestions(plannedIncomes, referenceMonths);

      expect(result).toHaveLength(2);

      const salary = result.find((r) => r.incomeCategory === 'income:salary:charles');
      expect(salary).toBeDefined();
      // (100000 / 12) * 12 = 100000
      expect(salary?.baseAmount).toBe(100000);
      expect(salary?.calculatedFrom?.sampleCount).toBe(2);
      expect(salary?.calculatedFrom?.ledgerCode).toBe('income:salary:charles');
      expect(salary?.importedFrom).toBe('transactionEntries');
    });
  });

  describe('calculateIncomeImportMetadata', () => {
    it('should calculate metadata correctly', () => {
      const d1 = new Date(Date.UTC(2025, 0, 1));
      const d2 = new Date(Date.UTC(2025, 1, 1));
      const validIncomes = [
        { amount: 1000, date: d1 } as PlannedIncome,
        { amount: 2000, date: d2 } as PlannedIncome,
      ];
      const result = calculateIncomeImportMetadata(validIncomes);

      expect(result).not.toBeNull();
      expect(result?.totalAmount).toBe(3000);
      expect(result?.monthlyAverage).toBe(250);
      expect(result?.sampleCount).toBe(2);
      expect(result?.sampleYear).toBe(2025);
    });

    it('should return null if no incomes', () => {
      expect(calculateIncomeImportMetadata([])).toBeNull();
    });
  });
});
