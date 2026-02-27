import { describe, expect, it } from 'vitest';

import {
  calculateSubtotals,
  calculateTotal,
  filterByDateRange,
  groupByCategory,
  sortByAmount,
  sumByCategory,
} from './aggregationUtils';

describe('aggregationUtils', () => {
  const mockItems = [
    { category: '生活費用', subcategory: '食物', amount: 1000 },
    { category: '生活費用', subcategory: '衣服', amount: 500 },
    { category: '居住費用', subcategory: '房租', amount: 5000 },
    { category: '交通費用', subcategory: '油費', amount: 800 },
  ];

  describe('sumByCategory', () => {
    it('should sum amounts by category', () => {
      const result = sumByCategory(mockItems, 'category', 'amount');

      expect(result.get('生活費用')).toBe(1500);
      expect(result.get('居住費用')).toBe(5000);
      expect(result.get('交通費用')).toBe(800);
    });

    it('should handle empty array', () => {
      const result = sumByCategory([], 'category', 'amount');

      expect(result.size).toBe(0);
    });
  });

  describe('groupByCategory', () => {
    it('should group items by category', () => {
      const result = groupByCategory(mockItems, 'category');

      expect(result['生活費用'].length).toBe(2);
      expect(result['居住費用'].length).toBe(1);
      expect(result['交通費用'].length).toBe(1);
    });

    it('should preserve item properties', () => {
      const result = groupByCategory(mockItems, 'category');

      expect(result['生活費用'][0].subcategory).toBe('食物');
      expect(result['生活費用'][1].subcategory).toBe('衣服');
    });
  });

  describe('calculateSubtotals', () => {
    it('should calculate subtotals for grouped data', () => {
      const grouped = groupByCategory(mockItems, 'category');
      const subtotals = calculateSubtotals(grouped, 'amount');

      const livingSubtotal = subtotals.find((s) => s.category === '生活費用');
      expect(livingSubtotal?.subtotal).toBe(1500);

      const housingSubtotal = subtotals.find((s) => s.category === '居住費用');
      expect(housingSubtotal?.subtotal).toBe(5000);
    });

    it('should include items in result', () => {
      const grouped = groupByCategory(mockItems, 'category');
      const subtotals = calculateSubtotals(grouped, 'amount');

      const livingSubtotal = subtotals.find((s) => s.category === '生活費用');
      expect(livingSubtotal?.items.length).toBe(2);
    });
  });

  describe('sortByAmount', () => {
    it('should sort by amount descending by default', () => {
      const sorted = sortByAmount(mockItems, 'amount');

      expect(sorted[0].amount).toBe(5000);
      expect(sorted[1].amount).toBe(1000);
      expect(sorted[2].amount).toBe(800);
      expect(sorted[3].amount).toBe(500);
    });

    it('should sort by amount ascending when specified', () => {
      const sorted = sortByAmount(mockItems, 'amount', false);

      expect(sorted[0].amount).toBe(500);
      expect(sorted[1].amount).toBe(800);
      expect(sorted[2].amount).toBe(1000);
      expect(sorted[3].amount).toBe(5000);
    });

    it('should not mutate original array', () => {
      const original = [...mockItems];
      sortByAmount(mockItems, 'amount');

      expect(mockItems).toEqual(original);
    });
  });

  describe('calculateTotal', () => {
    it('should calculate sum of all amounts', () => {
      const total = calculateTotal(mockItems, 'amount');

      expect(total).toBe(7300);
    });

    it('should return 0 for empty array', () => {
      const total = calculateTotal([], 'amount');

      expect(total).toBe(0);
    });
  });

  describe('filterByDateRange', () => {
    const itemsWithDates = [
      { date: new Date(2025, 0, 5), amount: 100 }, // Jan 5
      { date: new Date(2025, 0, 15), amount: 200 }, // Jan 15
      { date: new Date(2025, 0, 25), amount: 300 }, // Jan 25
      { date: new Date(2025, 1, 5), amount: 400 }, // Feb 5
    ];

    it('should filter items within date range', () => {
      const start = new Date(2025, 0, 10);
      const end = new Date(2025, 0, 31);

      const filtered = filterByDateRange(itemsWithDates, 'date', start, end);

      expect(filtered.length).toBe(2);
      expect(filtered[0].amount).toBe(200);
      expect(filtered[1].amount).toBe(300);
    });

    it('should include boundary dates', () => {
      const start = new Date(2025, 0, 5);
      const end = new Date(2025, 0, 15);

      const filtered = filterByDateRange(itemsWithDates, 'date', start, end);

      expect(filtered.length).toBe(2);
    });

    it('should return empty array when no items in range', () => {
      const start = new Date(2025, 2, 1);
      const end = new Date(2025, 2, 31);

      const filtered = filterByDateRange(itemsWithDates, 'date', start, end);

      expect(filtered.length).toBe(0);
    });
  });
});
