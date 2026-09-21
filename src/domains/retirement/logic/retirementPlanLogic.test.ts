import { describe, expect, it } from 'vitest';

import {
  type PlannedIncome,
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
      expect(salary?.currentAnnual).toBe(100000);
      expect(salary?.calculatedFrom?.sampleCount).toBe(2);
      expect(salary?.calculatedFrom?.ledgerCode).toBe('income:salary:charles');
      expect(salary).not.toHaveProperty('importedFrom');
      expect(salary).not.toHaveProperty('autoUpdate');
    });
  });
});
