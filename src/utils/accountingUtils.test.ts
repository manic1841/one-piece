import { describe, expect, it } from 'vitest';

import {
  type AccountingItem,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  formatCategory,
  getCategoryType,
  getDefaultCategoryOrder,
  isExpenseCategory,
  isIncomeCategory,
  isValidCategory,
  sortByOrder,
} from './accountingUtils';

describe('accountingUtils', () => {
  describe('category validation', () => {
    it('should identify valid income categories', () => {
      expect(isIncomeCategory(INCOME_CATEGORIES.SALARY)).toBe(true);
      expect(isIncomeCategory(INCOME_CATEGORIES.BONUS)).toBe(true);
      expect(isIncomeCategory('Invalid')).toBe(false);
    });

    it('should identify valid expense categories', () => {
      expect(isExpenseCategory(EXPENSE_CATEGORIES.LIVING)).toBe(true);
      expect(isExpenseCategory(EXPENSE_CATEGORIES.HOUSING)).toBe(true);
      expect(isExpenseCategory('Invalid')).toBe(false);
    });

    it('should validate any category', () => {
      expect(isValidCategory(INCOME_CATEGORIES.SALARY)).toBe(true);
      expect(isValidCategory(EXPENSE_CATEGORIES.LIVING)).toBe(true);
      expect(isValidCategory('Invalid')).toBe(false);
    });
  });

  describe('getCategoryType', () => {
    it('should return income for income categories', () => {
      expect(getCategoryType(INCOME_CATEGORIES.SALARY)).toBe('income');
      expect(getCategoryType(INCOME_CATEGORIES.BONUS)).toBe('income');
    });

    it('should return expense for expense categories', () => {
      expect(getCategoryType(EXPENSE_CATEGORIES.LIVING)).toBe('expense');
      expect(getCategoryType(EXPENSE_CATEGORIES.HOUSING)).toBe('expense');
    });

    it('should return null for invalid categories', () => {
      expect(getCategoryType('Invalid')).toBe(null);
    });
  });

  describe('sortByOrder', () => {
    it('should sort by order field first', () => {
      const items: AccountingItem[] = [
        { category: 'A', amount: 100, order: 2 },
        { category: 'B', amount: 200, order: 1 },
        { category: 'C', amount: 150, order: 3 },
      ];

      const sorted = sortByOrder(items);

      expect(sorted[0].category).toBe('B');
      expect(sorted[1].category).toBe('A');
      expect(sorted[2].category).toBe('C');
    });

    it('should sort by amount (descending) when order is same', () => {
      const items: AccountingItem[] = [
        { category: 'A', amount: 100, order: 1 },
        { category: 'B', amount: 200, order: 1 },
        { category: 'C', amount: 150, order: 1 },
      ];

      const sorted = sortByOrder(items);

      expect(sorted[0].amount).toBe(200);
      expect(sorted[1].amount).toBe(150);
      expect(sorted[2].amount).toBe(100);
    });

    it('should handle items without order field', () => {
      const items: AccountingItem[] = [
        { category: 'A', amount: 100 },
        { category: 'B', amount: 200, order: 1 },
        { category: 'C', amount: 150 },
      ];

      const sorted = sortByOrder(items);

      // Items with order should come first
      expect(sorted[0].category).toBe('B');
    });
  });

  describe('getDefaultCategoryOrder', () => {
    it('should return lower number for higher priority income', () => {
      const salaryOrder = getDefaultCategoryOrder(INCOME_CATEGORIES.SALARY);
      const otherOrder = getDefaultCategoryOrder(INCOME_CATEGORIES.OTHER);

      expect(salaryOrder).toBeLessThan(otherOrder);
    });

    it('should return lower number for higher priority expense', () => {
      const livingOrder = getDefaultCategoryOrder(EXPENSE_CATEGORIES.LIVING);
      const otherOrder = getDefaultCategoryOrder(EXPENSE_CATEGORIES.OTHER);

      expect(livingOrder).toBeLessThan(otherOrder);
    });

    it('should return default for unknown category', () => {
      const order = getDefaultCategoryOrder('Unknown');
      expect(order).toBe(50);
    });
  });

  describe('formatCategory', () => {
    it('should return category only when no subcategory', () => {
      expect(formatCategory('生活費用')).toBe('生活費用');
    });

    it('should return category and subcategory when both provided', () => {
      expect(formatCategory('生活費用', '食物')).toBe('生活費用 - 食物');
    });
  });
});
