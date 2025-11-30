import { Timestamp } from 'firebase/firestore';
import {
  type IncomeStatement,
  type CategoryGroup,
  type IncomeStatementItem,
  type ProjectSnapshot,
  type Project,
  type PlannedIncome,
  type Transaction,
  type AccountingConfig,
  IncomeStatementSchema,
} from '../../../schemas';
import {
  groupByCategory,
  calculateSubtotals,
  calculateTotal,
} from '../../../utils/aggregationUtils';
import { sortByOrder } from '../../../utils/accountingUtils';

/**
 * Pure function to calculate the income statement
 */
export function calculateIncomeStatement(
  plannedIncomes: PlannedIncome[],
  incomeTransactions: Transaction[],
  snapshots: Array<ProjectSnapshot & { projectId: string }>,
  projects: Project[],
  accountingConfig: AccountingConfig | null,
  startDate: Date,
  endDate: Date,
  createdBy: string,
  householdId: string,
): IncomeStatement {
  // 1. Build Income Section
  const income = buildIncomeSection(plannedIncomes, incomeTransactions, projects);

  // 2. Build Expense Section
  const expense = buildExpenseSection(snapshots, projects, accountingConfig);

  // 3. Calculate net income
  const netIncome = income.total - expense.total;

  // 4. Determine period type
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

  // 5. Create income statement object
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

  // Validate with schema
  return IncomeStatementSchema.parse(incomeStatement);
}

/**
 * Build income section from planned income and extra transactions
 */
function buildIncomeSection(
  plannedIncomes: PlannedIncome[],
  incomeTransactions: Transaction[],
  projects: Project[],
): { categories: CategoryGroup[]; total: number } {
  const items: IncomeStatementItem[] = [];
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // 1. Process Planned Income (Salary, Bonus, Other)
  const incomeCategoryMap: Record<string, string> = {
    salary: '薪資收入',
    bonus: '獎金收入',
    other: '其他收入',
  };

  for (const pi of plannedIncomes) {
    items.push({
      id: pi.id,
      category: incomeCategoryMap[pi.category] || pi.category,
      subcategory: pi.description || 'Planned Income',
      amount: pi.amount,
      sourceType: 'plannedIncome',
      sourceId: pi.id,
    });
  }

  // 2. Process Extra Income (Transactions)
  // Group by project
  const transactionsByProject = new Map<string, Transaction[]>();
  for (const t of incomeTransactions) {
    const projectId = t.projectId;
    if (!transactionsByProject.has(projectId)) {
      transactionsByProject.set(projectId, []);
    }
    transactionsByProject.get(projectId)!.push(t);
  }

  for (const [projectId, transactions] of transactionsByProject) {
    const project = projectMap.get(projectId);
    const projectName = project ? project.name : 'Unknown Project';
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    if (totalAmount > 0) {
      items.push({
        id: `extra-${projectId}`,
        category: '額外收入',
        subcategory: projectName,
        amount: totalAmount,
        sourceType: 'transaction', // Represents aggregated transactions
        sourceId: projectId,
      });
    }
  }

  // 3. Group and Calculate
  // Define order for income categories
  const categoryOrder: Record<string, number> = {
    薪資收入: 1,
    獎金收入: 2,
    其他收入: 3,
    額外收入: 4,
  };

  const grouped = groupByCategory(items, 'category');
  const subtotals = calculateSubtotals(grouped, 'amount');

  const categories: CategoryGroup[] = subtotals.map(({ category, subtotal, items }) => ({
    category,
    items: sortByOrder(items as IncomeStatementItem[]),
    subtotal,
    order: categoryOrder[category] || 99,
  }));

  // Sort categories
  const sortedCategories = categories.sort((a, b) => (a.order || 99) - (b.order || 99));

  return {
    categories: sortedCategories,
    total: calculateTotal(items, 'amount'),
  };
}

/**
 * Build expense section from project snapshots
 */
function buildExpenseSection(
  snapshots: Array<ProjectSnapshot & { projectId: string }>,
  projects: Project[],
  accountingConfig: AccountingConfig | null,
): { categories: CategoryGroup[]; total: number } {
  const items: IncomeStatementItem[] = [];
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // Group snapshots by project to sum expenses
  const snapshotsByProject = new Map<string, ProjectSnapshot[]>();
  for (const s of snapshots) {
    if (!snapshotsByProject.has(s.projectId)) {
      snapshotsByProject.set(s.projectId, []);
    }
    snapshotsByProject.get(s.projectId)!.push(s);
  }

  // Process each project
  for (const [projectId, projectSnapshots] of snapshotsByProject) {
    const project = projectMap.get(projectId);
    if (!project) continue;

    const totalExpense = projectSnapshots.reduce((sum, s) => sum + (s.expense || 0), 0);

    if (totalExpense > 0) {
      // Determine accounting category
      // Only include if mapped in accounting config
      if (accountingConfig && accountingConfig.projectMappings[projectId]) {
        const category = accountingConfig.projectMappings[projectId];

        items.push({
          id: `${projectId}-expense`,
          category,
          subcategory: project.name,
          amount: totalExpense,
          sourceType: 'project',
          sourceId: projectId,
        });
      }
    }
  }

  // Define order for expense categories
  const categoryOrder: Record<string, number> = {
    生活: 1,
    居住: 2,
    交通: 3,
    保險: 4,
    利息: 5,
    稅: 6,
    其他: 99,
  };

  const grouped = groupByCategory(items, 'category');
  const subtotals = calculateSubtotals(grouped, 'amount');

  const categories: CategoryGroup[] = subtotals.map(({ category, subtotal, items }) => ({
    category,
    items: sortByOrder(items as IncomeStatementItem[]),
    subtotal,
    order: categoryOrder[category] || 99,
  }));

  // Sort categories
  const sortedCategories = categories.sort((a, b) => (a.order || 99) - (b.order || 99));

  return {
    categories: sortedCategories,
    total: calculateTotal(items, 'amount'),
  };
}
