/**
 * Data aggregation utilities
 * Provides functions for grouping, summing, and calculating totals
 */

/**
 * Item with a numeric value
 */
interface ValueItem {
  [key: string]: unknown;
}

/**
 * Grouped data result
 */
export interface GroupedData<T> {
  [category: string]: T[];
}

/**
 * Category subtotal
 */
export interface CategorySubtotal {
  category: string;
  subtotal: number;
  items: unknown[];
}

/**
 * Sum values by category
 * @param items - Array of items to sum
 * @param categoryField - Field name containing the category
 * @param amountField - Field name containing the amount
 * @returns Map of category to total amount
 */
export const sumByCategory = <T extends ValueItem>(
  items: T[],
  categoryField: keyof T,
  amountField: keyof T,
): Map<string, number> => {
  const result = new Map<string, number>();

  for (const item of items) {
    const category = String(item[categoryField]);
    const amount = Number(item[amountField]) || 0;

    const current = result.get(category) || 0;
    result.set(category, current + amount);
  }

  return result;
};

/**
 * Group items by category
 * @param items - Array of items to group
 * @param categoryField - Field name containing the category
 * @returns Object with categories as keys and arrays of items as values
 */
export const groupByCategory = <T extends ValueItem>(
  items: T[],
  categoryField: keyof T,
): GroupedData<T> => {
  const result: GroupedData<T> = {};

  for (const item of items) {
    const category = String(item[categoryField]);

    if (!result[category]) {
      result[category] = [];
    }

    result[category].push(item);
  }

  return result;
};

/**
 * Calculate subtotals for grouped data
 * @param grouped - Grouped data object
 * @param amountField - Field name containing the amount
 * @returns Array of category subtotals
 */
export const calculateSubtotals = <T extends ValueItem>(
  grouped: GroupedData<T>,
  amountField: keyof T,
): CategorySubtotal[] => {
  return Object.entries(grouped).map(([category, items]) => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (Number(item[amountField]) || 0);
    }, 0);

    return {
      category,
      subtotal,
      items,
    };
  });
};

/**
 * Sort items by amount
 * @param items - Array of items to sort
 * @param amountField - Field name containing the amount
 * @param descending - Sort in descending order (default: true)
 * @returns Sorted array
 */
export const sortByAmount = <T extends ValueItem>(
  items: T[],
  amountField: keyof T,
  descending: boolean = true,
): T[] => {
  return [...items].sort((a, b) => {
    const amountA = Number(a[amountField]) || 0;
    const amountB = Number(b[amountField]) || 0;

    return descending ? amountB - amountA : amountA - amountB;
  });
};

/**
 * Calculate total of all amounts
 * @param items - Array of items
 * @param amountField - Field name containing the amount
 * @returns Total amount
 */
export const calculateTotal = <T extends ValueItem>(items: T[], amountField: keyof T): number => {
  return items.reduce((sum, item) => {
    return sum + (Number(item[amountField]) || 0);
  }, 0);
};

/**
 * Filter items by date range
 * @param items - Array of items
 * @param dateField - Field name containing the date
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Filtered array
 */
export const filterByDateRange = <T extends ValueItem>(
  items: T[],
  dateField: keyof T,
  startDate: Date,
  endDate: Date,
): T[] => {
  return items.filter((item) => {
    const itemDate = new Date(item[dateField] as string | number | Date);
    return itemDate >= startDate && itemDate <= endDate;
  });
};
