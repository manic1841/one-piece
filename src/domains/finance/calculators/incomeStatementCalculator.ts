import { Timestamp } from 'firebase/firestore';
import {
  type IncomeStatement,
  type CategoryGroup,
  type IncomeStatementItem,
  type Transaction,
  type Project,
  IncomeStatementSchema,
} from '../../../schemas';
import {
  groupByCategory,
  calculateSubtotals,
  calculateTotal,
} from '../../../utils/aggregationUtils';
import {
  getCategoryType,
  getDefaultCategoryOrder,
  sortByOrder,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '../../../utils/accountingUtils';

/**
 * Pure function to calculate the income statement from transactions and projects.
 */
export function calculateIncomeStatement(
  transactions: Transaction[],
  projects: Project[],
  startDate: Date,
  endDate: Date,
  createdBy: string,
  householdId: string
): IncomeStatement {
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // 1. Convert transactions to income statement items
  const items = transactionsToItems(transactions, projectMap);

  // 2. Separate into income and expense
  const incomeItems = items.filter((item) => getCategoryType(item.category) === 'income');
  const expenseItems = items.filter((item) => getCategoryType(item.category) === 'expense');

  // 3. Group and calculate
  const income = buildSection(incomeItems);
  const expense = buildSection(expenseItems);

  // 4. Calculate net income
  const netIncome = income.total - expense.total;

  // 5. Determine period type and extract year/month/quarter
  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  let periodType: 'monthly' | 'quarterly' | 'yearly';
  const year = startDate.getFullYear();
  let month: number | undefined;
  let quarter: number | undefined;

  if (periodDays <= 31) {
    periodType = 'monthly';
    month = startDate.getMonth() + 1;
  } else if (periodDays <= 100) {
    periodType = 'quarterly';
    quarter = Math.floor(startDate.getMonth() / 3) + 1;
  } else {
    periodType = 'yearly';
  }

  // 6. Create income statement object
  const incomeStatement: IncomeStatement = {
    id: `is-${householdId}-${startDate.getTime()}-${endDate.getTime()}`,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    periodType,
    year,
    month,
    quarter,
    income,
    expense,
    netIncome,
    createdAt: Timestamp.now(),
    createdBy,
  };

  // Validate with schema (optional but good for safety)
  return IncomeStatementSchema.parse(incomeStatement);
}

/**
 * Convert transactions to income statement items
 */
function transactionsToItems(
  transactions: Transaction[],
  projectMap: Map<string, Project>
): IncomeStatementItem[] {
  return transactions.map((transaction) => {
    const project = projectMap.get(transaction.projectId);

    // Determine category and subcategory
    let category = transaction.category;
    let subcategory: string | undefined;
    let order: number | undefined;

    // Check if project has accounting configuration
    if (project?.accounting?.enabled && project.accounting.incomeStatement) {
      const accountingConfig = project.accounting.incomeStatement;
      // Use category from transaction but can be enhanced with project config
      subcategory = project.name;
      order = accountingConfig.order ?? getDefaultCategoryOrder(category);
    } else {
      // Use default order based on category
      order = getDefaultCategoryOrder(category);
    }

    // Ensure category is valid, fallback to "其他"
    if (getCategoryType(category) === null) {
      category = transaction.type === 'income' ? INCOME_CATEGORIES.OTHER : EXPENSE_CATEGORIES.OTHER;
    }

    return {
      id: transaction.id,
      category,
      subcategory,
      amount: transaction.amount,
      order,
      sourceType: 'transaction',
      sourceId: transaction.id,
    };
  });
}

/**
 * Build income or expense section
 */
function buildSection(items: IncomeStatementItem[]): {
  categories: CategoryGroup[];
  total: number;
} {
  // Group by category
  const grouped = groupByCategory(items, 'category');

  // Calculate subtotals
  const subtotals = calculateSubtotals(grouped, 'amount');

  // Convert to CategoryGroup format
  const categories: CategoryGroup[] = subtotals.map(({ category, subtotal, items }) => ({
    category,
    items: sortByOrder(items as IncomeStatementItem[]),
    subtotal,
    order: getDefaultCategoryOrder(category),
  }));

  // Sort categories by order
  const sortedCategories = sortByOrder(categories);

  // Calculate total
  const total = calculateTotal(items, 'amount');

  return {
    categories: sortedCategories,
    total,
  };
}
