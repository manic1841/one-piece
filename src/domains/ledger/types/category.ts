import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants';

/**
 * Category type
 */
export type CategoryType = 'income' | 'expense';

/**
 * Income category values
 */
export type IncomeCategory = (typeof INCOME_CATEGORIES)[keyof typeof INCOME_CATEGORIES];

/**
 * Expense category values
 */
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[keyof typeof EXPENSE_CATEGORIES];

/**
 * Any category value
 */
export type Category = IncomeCategory | ExpenseCategory;

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
