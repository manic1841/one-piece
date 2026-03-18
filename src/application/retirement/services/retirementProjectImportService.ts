import { startOfMonth, subMonths } from 'date-fns';

import { type RetirementExpenseCategory } from '@/domains/retirement/types';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

type ActiveProject = {
  id: string;
  name: string;
};

export async function importRetirementExpensesFromProjects(params: {
  householdId: string;
  referenceMonths: number;
  projectMappings: Record<string, string>;
  projects: ActiveProject[];
}): Promise<RetirementExpenseCategory[]> {
  const { householdId, referenceMonths, projectMappings, projects } = params;

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const end = new Date();
  const start = startOfMonth(subMonths(end, Math.max(referenceMonths - 1, 0)));
  const categories: RetirementExpenseCategory[] = [];

  for (const [projectId, expenseCategoryId] of Object.entries(projectMappings)) {
    const transactions = await transactionRepository.listByProject(householdId, projectId);
    const totalExpense = transactions
      .filter((tx) => tx.date >= start && tx.date <= end)
      .reduce((sum, tx) => {
        const expenseLines = tx.entries
          .filter((entry) => entry.ledgerCode.startsWith('expense:'))
          .reduce((lineSum, entry) => lineSum + Math.max(0, entry.debit - entry.credit), 0);

        return sum + expenseLines;
      }, 0);

    const monthlyAverage = totalExpense / referenceMonths;
    const annualAmount = monthlyAverage * 12;

    categories.push({
      id: expenseCategoryId,
      name: projectById.get(projectId)?.name ?? `Project ${projectId}`,
      sourceProjectId: projectId,
      baseAmount: Math.round(annualAmount),
      growthRate: 2,
      retirementMultiplier: 1,
      startYear: new Date().getFullYear(),
      endYear: null,
      note: `Imported from project over last ${referenceMonths} months`,
    });
  }

  return categories;
}
