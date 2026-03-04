import { describe, expect, it } from 'vitest';

import { type BalanceSheetData, type CashFlowData, type IncomeStatementData } from '@/schemas';

import {
  aggregateCashFlows,
  aggregateIncomeStatements,
  aggregateLatestBalanceSheet,
} from './reportAggregation';

describe('reportAggregation', () => {
  describe('aggregateIncomeStatements', () => {
    it('should sum up totals and merge items', () => {
      const reports: IncomeStatementData[] = [
        {
          revenue: { total: 100, items: [{ category: 'Salary', amount: 100 }] },
          expenses: { total: 50, items: [{ category: 'Rent', amount: 50 }] },
          netIncome: 50,
        },
        {
          revenue: { total: 200, items: [{ category: 'Salary', amount: 200 }] },
          expenses: { total: 60, items: [{ category: 'Rent', amount: 60 }] },
          netIncome: 140,
        },
      ];

      const result = aggregateIncomeStatements(reports);
      expect(result.revenue.total).toBe(300);
      expect(result.expenses.total).toBe(110);
      expect(result.netIncome).toBe(190);
      expect(result.revenue.items[0].amount).toBe(300);
      expect(result.expenses.items[0].amount).toBe(110);
    });
  });

  describe('aggregateCashFlows', () => {
    it('should sum flows and handle beginning/ending balances', () => {
      const reports: CashFlowData[] = [
        {
          operating: { income: [], expense: [], netAmount: 10, items: [] },
          investing: { income: [], expense: [], netAmount: 0, items: [] },
          financing: { income: [], expense: [], netAmount: 0, items: [] },
          netChange: 10,
          beginningBalance: 100,
          endingBalance: 110,
        },
        {
          operating: { income: [], expense: [], netAmount: 20, items: [] },
          investing: { income: [], expense: [], netAmount: 0, items: [] },
          financing: { income: [], expense: [], netAmount: 0, items: [] },
          netChange: 20,
          beginningBalance: 110,
          endingBalance: 130,
        },
      ];

      const result = aggregateCashFlows(reports);
      expect(result.operating.netAmount).toBe(30);
      expect(result.netChange).toBe(30);
      expect(result.beginningBalance).toBe(100);
      expect(result.endingBalance).toBe(130);
    });
  });

  describe('aggregateLatestBalanceSheet', () => {
    it('should return the last report', () => {
      const reports: BalanceSheetData[] = [
        {
          assets: { total: 100, items: [] },
          liabilities: { total: 0, items: [] },
          equity: { total: 100, items: [] },
        },
        {
          assets: { total: 200, items: [] },
          liabilities: { total: 0, items: [] },
          equity: { total: 200, items: [] },
        },
      ];

      const result = aggregateLatestBalanceSheet(reports);
      expect(result.assets.total).toBe(200);
    });
  });
});
