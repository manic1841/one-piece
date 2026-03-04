import { describe, expect, it } from 'vitest';

import { AssetSubCategory, EquitySubCategory } from '../../../domains/finance/types/categories';
import type { BalanceSheetData } from '../../../schemas/balanceSheet';
import * as testData from './__testHelpers__/balanceSheetTestData';
import { calculateBalanceSheet } from './balanceSheetCalculator';

describe('balanceSheetCalculator', () => {
  describe('calculateBalanceSheet', () => {
    it('should calculate balance sheet with only cash accounts', () => {
      const result = calculateBalanceSheet(
        testData.cashAccountsData.accountWithSnapshots,
        testData.cashAccountsData.projectsWithSnapshots,
      );

      expect(result.assets.total).toBe(3000);
      expect(result.assets.items).toHaveLength(1);
      expect(result.assets.items[0].category).toBe(AssetSubCategory.CASH);
    });

    it('should calculate balance sheet with investments', () => {
      const result = calculateBalanceSheet(
        testData.investmentData.accountWithSnapshots,
        testData.investmentData.projectsWithSnapshots,
      ) as BalanceSheetData;

      expect(result.assets.total).toBe(5000);
      const investmentItem = result.assets.items.find(
        (item) => item.category === AssetSubCategory.INVESTMENTS,
      );
      expect(investmentItem?.amount).toBe(5000);
    });

    it('should calculate balance sheet with various asset types', () => {
      const result = calculateBalanceSheet(
        testData.assetsData.accountWithSnapshots,
        testData.assetsData.projectsWithSnapshots,
      );

      expect(result.assets.total).toBe(13000);
      expect(result.assets.items.length).toBeGreaterThan(0);
    });

    it('should calculate balance sheet with liabilities', () => {
      const result = calculateBalanceSheet(
        testData.liabilitiesData.accountWithSnapshots,
        testData.liabilitiesData.projectsWithSnapshots,
      );

      expect(result.liabilities.total).toBe(5000);
      expect(result.liabilities.items.length).toBeGreaterThan(0);
    });

    it('should calculate balance sheet with equity', () => {
      const result = calculateBalanceSheet(
        testData.equityData.accountWithSnapshots,
        testData.equityData.projectsWithSnapshots,
      );

      expect(result.equity.total).toBe(8000);
      expect(result.equity.items.length).toBeGreaterThan(0);
    });

    it('should calculate balance sheet with mixed categories', () => {
      const result = calculateBalanceSheet(
        testData.mixedBalanceSheetData.accountWithSnapshots,
        testData.mixedBalanceSheetData.projectsWithSnapshots,
      );

      expect(result.assets.total).toBe(6000);
      expect(result.liabilities.total).toBe(3000);
      expect(result.equity.total).toBe(3000);
    });

    it('should return zero totals for empty data', () => {
      const result = calculateBalanceSheet(
        testData.emptyData.accountWithSnapshots,
        testData.emptyData.projectsWithSnapshots,
      );

      expect(result.assets.total).toBe(0);
      expect(result.liabilities.total).toBe(0);
      expect(result.equity.total).toBe(0);
    });

    it('should aggregate amounts correctly', () => {
      const result = calculateBalanceSheet(
        testData.aggregationData.accountWithSnapshots,
        testData.aggregationData.projectsWithSnapshots,
      ) as BalanceSheetData;

      expect(result.assets.total).toBe(8000); // 3000 cash + 5000 investments
      const cashItem = result.assets.items.find((item) => item.category === AssetSubCategory.CASH);
      expect(cashItem?.amount).toBe(3000);
    });

    it('should calculate stock profit from holding cost and market value', () => {
      const result = calculateBalanceSheet(
        testData.stockProfitData.accountWithSnapshots as any,
        testData.stockProfitData.projectsWithSnapshots,
      );

      const stockProfitItem = result.equity.items.find(
        (item) => item.category === EquitySubCategory.STOCK_PROFIT,
      );
      expect(stockProfitItem?.amount).toBe(500); // 1500 - 1000
    });
  });
});
