import { describe, expect, it } from 'vitest';

import {
  aggregationData,
  bonusData,
  emptyData,
  incomeAndExpenseData,
  multipleIncomeData,
  noAccountingData,
  projectExpenseData,
  projectIncomeData,
  salaryData,
} from './__testHelpers__/incomeStatementTestData';
import { calculateIncomeStatement } from './incomeStatementCalculator';

describe('incomeStatementCalculator', () => {
  describe('calculateIncomeStatement', () => {
    it('should calculate salary income correctly', () => {
      const result = calculateIncomeStatement(salaryData.plannedIncomes, salaryData.projects);

      expect(result.revenue.total).toBe(50000);
      expect(result.revenue.items).toHaveLength(1);
      expect(result.revenue.items[0].amount).toBe(50000);
      expect(result.expenses.total).toBe(0);
      expect(result.netIncome).toBe(50000);
    });

    it('should calculate bonus income correctly', () => {
      const result = calculateIncomeStatement(bonusData.plannedIncomes, bonusData.projects);

      expect(result.revenue.total).toBe(10000);
      expect(result.revenue.items).toHaveLength(1);
      expect(result.revenue.items[0].amount).toBe(10000);
      expect(result.expenses.total).toBe(0);
      expect(result.netIncome).toBe(10000);
    });

    it('should calculate project income correctly', () => {
      const result = calculateIncomeStatement(
        projectIncomeData.plannedIncomes,
        projectIncomeData.projects,
      );

      expect(result.revenue.total).toBe(15000);
      expect(result.revenue.items).toHaveLength(1);
      expect(result.revenue.items[0].amount).toBe(15000);
      expect(result.expenses.total).toBe(0);
      expect(result.netIncome).toBe(15000);
    });

    it('should calculate project expenses correctly', () => {
      const result = calculateIncomeStatement(
        projectExpenseData.plannedIncomes,
        projectExpenseData.projects,
      );

      expect(result.revenue.total).toBe(0);
      expect(result.expenses.total).toBe(5000);
      expect(result.expenses.items).toHaveLength(1);
      expect(result.expenses.items[0].amount).toBe(5000);
      expect(result.netIncome).toBe(-5000);
    });

    it('should handle multiple income sources', () => {
      const result = calculateIncomeStatement(
        multipleIncomeData.plannedIncomes,
        multipleIncomeData.projects,
      );

      // Salary 50000 + Bonus 10000 + Project 8000 = 68000
      expect(result.revenue.total).toBe(68000);
      expect(result.revenue.items).toHaveLength(3); // Salary, Bonus, Other Income
      expect(result.expenses.total).toBe(0);
      expect(result.netIncome).toBe(68000);
    });

    it('should handle income and expense together', () => {
      const result = calculateIncomeStatement(
        incomeAndExpenseData.plannedIncomes,
        incomeAndExpenseData.projects,
      );

      // Revenue: Salary 60000 + Project 10000 = 70000
      expect(result.revenue.total).toBe(70000);
      // Expenses: Living 20000
      expect(result.expenses.total).toBe(20000);
      // Net Income: 70000 - 20000 = 50000
      expect(result.netIncome).toBe(50000);
    });

    it('should aggregate projects with same subcategory', () => {
      const result = calculateIncomeStatement(
        aggregationData.plannedIncomes,
        aggregationData.projects,
      );

      // Should aggregate both projects into one item
      expect(result.revenue.items).toHaveLength(1);
      expect(result.revenue.items[0].amount).toBe(8000); // 5000 + 3000
      expect(result.revenue.items[0].subItems).toHaveLength(2);
      expect(result.revenue.total).toBe(8000);
      expect(result.netIncome).toBe(8000);
    });

    it('should handle empty data', () => {
      const result = calculateIncomeStatement(emptyData.plannedIncomes, emptyData.projects);

      expect(result.revenue.total).toBe(0);
      expect(result.revenue.items).toHaveLength(0);
      expect(result.expenses.total).toBe(0);
      expect(result.expenses.items).toHaveLength(0);
      expect(result.netIncome).toBe(0);
    });

    it('should ignore projects without incomeStatement accounting', () => {
      const result = calculateIncomeStatement(
        noAccountingData.plannedIncomes,
        noAccountingData.projects,
      );

      // Should only count the salary, not the project
      expect(result.revenue.total).toBe(40000);
      expect(result.revenue.items).toHaveLength(1);
      expect(result.netIncome).toBe(40000);
    });
  });
});
