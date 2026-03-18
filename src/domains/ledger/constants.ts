/**
 * Income categories
 */
export const INCOME_CATEGORIES = {
  SALARY: '薪資收入',
  BONUS: '獎金收入',
  SIDE_BUSINESS: '副業收入',
  INVESTMENT: '投資收益',
  OTHER: '其他收入',
} as const;

/**
 * Expense categories
 */
export const EXPENSE_CATEGORIES = {
  LIVING: '生活支出',
  HOUSING: '住宅支出',
  TRANSPORTATION: '交通費用',
  INSURANCE: '保險費用',
  EDUCATION: '教育支出',
  ENTERTAINMENT: '娛樂支出',
  SOCIAL: '人際支出',
  OTHER: '其他支出',
} as const;

/**
 * All accounting categories
 */
export const ACCOUNTING_CATEGORIES = {
  INCOME: INCOME_CATEGORIES,
  EXPENSE: EXPENSE_CATEGORIES,
} as const;
