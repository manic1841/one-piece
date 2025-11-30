import { Timestamp } from 'firebase/firestore';
import {
  type IncomeStatement,
  type CategoryGroup,
  type IncomeStatementItem,
  IncomeStatementSchema,
  type Transaction,
  type Project,
} from '../schemas';
import { transactionService } from './transactionService';
import { projectService } from './projectService';
import {
  groupByCategory,
  calculateSubtotals,
  calculateTotal,
} from '../utils/aggregationUtils';
import {
  getCategoryType,
  getDefaultCategoryOrder,
  sortByOrder,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '../utils/accountingUtils';

/**
 * Service for generating and managing income statements
 */
class IncomeStatementService {
  /**
   * Generate income statement for a given period
   */
  async generateIncomeStatement(
    householdId: string,
    startDate: Date,
    endDate: Date,
    createdBy: string,
  ): Promise<IncomeStatement> {
    // 1. Fetch transactions for the period
    const transactions = await transactionService.getTransactionsByPeriod(
      householdId,
      startDate,
      endDate,
    );

    // 2. Fetch projects for accounting configuration
    const projects = await projectService.getProjects(householdId);
    const projectMap = new Map(projects.map(p => [p.id, p]));

    // 3. Convert transactions to income statement items
    const items = this.transactionsToItems(transactions, projectMap);

    // 4. Separate into income and expense
    const incomeItems = items.filter(item => getCategoryType(item.category) === 'income');
    const expenseItems = items.filter(item => getCategoryType(item.category) === 'expense');

    // 5. Group and calculate
    const income = this.buildSection(incomeItems);
    const expense = this.buildSection(expenseItems);

    // 6. Calculate net income
    const netIncome = income.total - expense.total;

    // 7. Determine period type and extract year/month/quarter
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

    // 8. Create income statement
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

    return IncomeStatementSchema.parse(incomeStatement);
  }

  /**
   * Convert transactions to income statement items
   */
  private transactionsToItems(
    transactions: Transaction[],
    projectMap: Map<string, Project>,
  ): IncomeStatementItem[] {
    return transactions.map(transaction => {
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
  private buildSection(items: IncomeStatementItem[]): {
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

  /**
   * Get income categories with totals
   */
  async getIncomeCategories(
    householdId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CategoryGroup[]> {
    const transactions = await transactionService.getTransactionsByPeriod(
      householdId,
      startDate,
      endDate,
    );

    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const projects = await projectService.getProjects(householdId);
    const projectMap = new Map(projects.map(p => [p.id, p]));

    const items = this.transactionsToItems(incomeTransactions, projectMap);
    const section = this.buildSection(items);

    return section.categories;
  }

  /**
   * Get expense categories with totals
   */
  async getExpenseCategories(
    householdId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CategoryGroup[]> {
    const transactions = await transactionService.getTransactionsByPeriod(
      householdId,
      startDate,
      endDate,
    );

    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const projects = await projectService.getProjects(householdId);
    const projectMap = new Map(projects.map(p => [p.id, p]));

    const items = this.transactionsToItems(expenseTransactions, projectMap);
    const section = this.buildSection(items);

    return section.categories;
  }

  /**
   * Calculate net income for a period
   */
  calculateNetIncome(incomeTotal: number, expenseTotal: number): number {
    return incomeTotal - expenseTotal;
  }
}

export const incomeStatementService = new IncomeStatementService();
