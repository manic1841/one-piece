import { describe, expect, it } from 'vitest';

import * as testData from './__testHelpers__/financialReportTestData';
import { reconcileReports } from './financialReportCalculator';

describe('financialReportCalculator', () => {
  describe('reconcileReports', () => {
    it('should reconcile when cash matches and balance sheet equation holds', () => {
      const result = reconcileReports(
        testData.reconciledData.balanceSheet,
        testData.reconciledData.cashFlow,
      );

      expect(result.reconciled).toBe(true);
      expect(result.difference).toBeLessThan(0.01);
    });

    it('should not reconcile when cash does not match', () => {
      const result = reconcileReports(
        testData.cashMismatchData.balanceSheet,
        testData.cashMismatchData.cashFlow,
      );

      expect(result.reconciled).toBe(false);
      expect(result.difference).toBe(5000);
    });

    it('should not reconcile when balance sheet equation does not hold', () => {
      const result = reconcileReports(
        testData.equationMismatchData.balanceSheet,
        testData.equationMismatchData.cashFlow,
      );

      expect(result.reconciled).toBe(false);
      expect(result.difference).toBe(10000); // 100000 - (30000 + 60000)
    });

    it('should handle missing cash asset in balance sheet', () => {
      const result = reconcileReports(
        testData.missingCashData.balanceSheet,
        testData.missingCashData.cashFlow,
      );

      expect(result.reconciled).toBe(false);
      expect(result.difference).toBe(-50000); // 0 - 50000
    });

    it('should handle floating point tolerance', () => {
      const result = reconcileReports(
        testData.floatingPointData.balanceSheet,
        testData.floatingPointData.cashFlow,
      );

      expect(result.reconciled).toBe(true); // Within tolerance
    });

    it('should prioritize balance sheet difference when cash is reconciled', () => {
      const result = reconcileReports(
        testData.priorityBalanceSheetData.balanceSheet,
        testData.priorityBalanceSheetData.cashFlow,
      );

      expect(result.reconciled).toBe(false);
      expect(result.difference).toBe(10000); // Balance sheet equation difference
    });

    it('should show cash difference when cash is not reconciled', () => {
      const result = reconcileReports(
        testData.priorityCashData.balanceSheet,
        testData.priorityCashData.cashFlow,
      );

      expect(result.reconciled).toBe(false);
      expect(result.difference).toBe(10000); // Cash difference (60000 - 50000)
    });
  });
});
