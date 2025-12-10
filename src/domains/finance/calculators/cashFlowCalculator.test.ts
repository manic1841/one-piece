import { describe, expect, it } from 'vitest';

import {
  aggregationData,
  allCategoriesData,
  emptyData,
  financingData,
  investingData,
  noAccountingData,
  operatingData,
} from './__testHelpers__/cashFlowTestData';
import { calculateCashFlowStatement } from './cashFlowCalculator';

describe('cashFlowCalculator', () => {
  describe('calculateCashFlowStatement', () => {
    it('should calculate operating activities correctly', () => {
      const result = calculateCashFlowStatement(
        operatingData.projects,
        operatingData.beginningCash,
      );

      expect(result.operating.income).toHaveLength(1);
      expect(result.operating.income[0].amount).toBe(10000);
      expect(result.operating.expense).toHaveLength(1);
      expect(result.operating.expense[0].amount).toBe(3000);
      expect(result.operating.netAmount).toBe(7000);
    });

    it('should calculate investing activities correctly', () => {
      const result = calculateCashFlowStatement(
        investingData.projects,
        investingData.beginningCash,
      );

      expect(result.investing.income).toHaveLength(1);
      expect(result.investing.income[0].amount).toBe(2000);
      expect(result.investing.expense).toHaveLength(1);
      expect(result.investing.expense[0].amount).toBe(5000);
      expect(result.investing.netAmount).toBe(-3000);
    });

    it('should calculate financing activities correctly', () => {
      const result = calculateCashFlowStatement(
        financingData.projects,
        financingData.beginningCash,
      );

      expect(result.financing.income).toHaveLength(1);
      expect(result.financing.income[0].amount).toBe(20000);
      expect(result.financing.expense).toHaveLength(1);
      expect(result.financing.expense[0].amount).toBe(5000);
      expect(result.financing.netAmount).toBe(15000);
    });

    it('should handle all categories together', () => {
      const result = calculateCashFlowStatement(
        allCategoriesData.projects,
        allCategoriesData.beginningCash,
      );

      // Operating: +15000 - 0 = +15000
      expect(result.operating.netAmount).toBe(15000);
      // Investing: +0 - 3000 = -3000
      expect(result.investing.netAmount).toBe(-3000);
      // Financing: +10000 - 0 = +10000
      expect(result.financing.netAmount).toBe(10000);
      // Net change: 15000 - 3000 + 10000 = 22000
      expect(result.netChange).toBe(22000);
      // Ending balance: 50000 + 22000 = 72000
      expect(result.endingBalance).toBe(72000);
    });

    it('should ignore projects without cashFlow accounting', () => {
      const result = calculateCashFlowStatement(
        noAccountingData.projects,
        noAccountingData.beginningCash,
      );

      expect(result.operating.items).toHaveLength(0);
      expect(result.investing.items).toHaveLength(0);
      expect(result.financing.items).toHaveLength(0);
      expect(result.netChange).toBe(0);
      expect(result.endingBalance).toBe(noAccountingData.beginningCash);
    });

    it('should handle empty projects array', () => {
      const result = calculateCashFlowStatement(emptyData.projects, emptyData.beginningCash);

      expect(result.operating.netAmount).toBe(0);
      expect(result.investing.netAmount).toBe(0);
      expect(result.financing.netAmount).toBe(0);
      expect(result.netChange).toBe(0);
      expect(result.endingBalance).toBe(emptyData.beginningCash);
    });

    it('should aggregate projects with same subcategory', () => {
      const result = calculateCashFlowStatement(
        aggregationData.projects,
        aggregationData.beginningCash,
      );

      // Should have one income item for same subcategory with total 8000
      expect(result.operating.income).toHaveLength(1);
      expect(result.operating.income[0].amount).toBe(8000);
      expect(result.operating.netAmount).toBe(8000);
    });
  });
});
