/**
 * Accounting utilities for financial reports
 * Manages accounting categories, classifications, and related functions
 */

/**
 * Income categories for Income Statement
 */
export const INCOME_CATEGORIES = {
  SALARY: '薪資收入',
  BONUS: '獎金收入',
  SIDE_BUSINESS: '副業收入',
  INVESTMENT: '投資收益',
  OTHER: '其他收入',
} as const;

/**
 * Expense categories for Income Statement
 */
export const EXPENSE_CATEGORIES = {
  LIVING: '生活費用',
  HOUSING: '居住費用',
  TRANSPORTATION: '交通費用',
  INSURANCE: '保險費用',
  EDUCATION: '教育費用',
  ENTERTAINMENT: '娛樂費用',
  SOCIAL: '人情費用',
  OTHER: '其他費用',
} as const;

/**
 * All accounting categories
 */
export const ACCOUNTING_CATEGORIES = {
  INCOME: INCOME_CATEGORIES,
  EXPENSE: EXPENSE_CATEGORIES,
} as const;

/**
 * Category type
 */
export type CategoryType = 'income' | 'expense';

/**
 * Income category values
 */
export type IncomeCategory = typeof INCOME_CATEGORIES[keyof typeof INCOME_CATEGORIES];

/**
 * Expense category values
 */
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[keyof typeof EXPENSE_CATEGORIES];

/**
 * Any category value
 */
export type Category = IncomeCategory | ExpenseCategory;

/**
 * Accounting item with category
 */
/**
 * Accounting item with category
 */
export interface AccountingItem {
  category: string;
  subcategory?: string;
  amount?: number;
  subtotal?: number;
  order?: number;
}

/**
 * Check if a string is a valid income category
 */
export const isIncomeCategory = (category: string): category is IncomeCategory => {
  return Object.values(INCOME_CATEGORIES).includes(category as IncomeCategory);
};

/**
 * Check if a string is a valid expense category
 */
export const isExpenseCategory = (category: string): category is ExpenseCategory => {
  return Object.values(EXPENSE_CATEGORIES).includes(category as ExpenseCategory);
};

/**
 * Check if a string is a valid category
 */
export const isValidCategory = (category: string): category is Category => {
  return isIncomeCategory(category) || isExpenseCategory(category);
};

/**
 * Get category type (income or expense)
 */
export const getCategoryType = (category: string): CategoryType | null => {
  if (isIncomeCategory(category)) return 'income';
  if (isExpenseCategory(category)) return 'expense';
  return null;
};

/**
 * Sort accounting items by order, then by amount/subtotal (descending)
 */
export const sortByOrder = <T extends AccountingItem>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    // First sort by order if exists
    if (a.order !== undefined && b.order !== undefined) {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
    } else if (a.order !== undefined) {
      return -1;
    } else if (b.order !== undefined) {
      return 1;
    }
    
    // Then sort by amount or subtotal (descending)
    const valA = a.amount ?? a.subtotal ?? 0;
    const valB = b.amount ?? b.subtotal ?? 0;
    return valB - valA;
  });
};

/**
 * Get default order for a category
 * Lower number = higher priority
 */
export const getDefaultCategoryOrder = (category: string): number => {
  const incomeOrder: Record<string, number> = {
    [INCOME_CATEGORIES.SALARY]: 1,
    [INCOME_CATEGORIES.BONUS]: 2,
    [INCOME_CATEGORIES.SIDE_BUSINESS]: 3,
    [INCOME_CATEGORIES.INVESTMENT]: 4,
    [INCOME_CATEGORIES.OTHER]: 99,
  };

  const expenseOrder: Record<string, number> = {
    [EXPENSE_CATEGORIES.LIVING]: 1,
    [EXPENSE_CATEGORIES.HOUSING]: 2,
    [EXPENSE_CATEGORIES.TRANSPORTATION]: 3,
    [EXPENSE_CATEGORIES.INSURANCE]: 4,
    [EXPENSE_CATEGORIES.EDUCATION]: 5,
    [EXPENSE_CATEGORIES.ENTERTAINMENT]: 6,
    [EXPENSE_CATEGORIES.SOCIAL]: 7,
    [EXPENSE_CATEGORIES.OTHER]: 99,
  };

  return incomeOrder[category] ?? expenseOrder[category] ?? 50;
};

/**
 * Format category for display
 */
export const formatCategory = (category: string, subcategory?: string): string => {
  if (subcategory) {
    return `${category} - ${subcategory}`;
  }
  return category;
};
