import { type ProjectWithSnapshot } from '@/domains/project/types';
import { ProjectExpenseBehavior } from '@/domains/project/types/categories';

import { FinancingSubCategory } from '../types';

/**
 * Calculates dividends from projects with snapshots.
 * Dividends are identified by FinancingSubCategory.OWNER_DEPOSIT or ProjectExpenseBehavior.OWNER_DEPOSIT.
 */
export function calculateDividends(projectsWithSnapshots: ProjectWithSnapshot[]): number {
  return projectsWithSnapshots
    .filter((p) => {
      const subcategory = p.accounting?.cashFlow?.subcategory;
      const behavior = p.accounting?.flowBehavior;
      return (
        subcategory === FinancingSubCategory.OWNER_DEPOSIT ||
        behavior?.expenseAs === ProjectExpenseBehavior.OWNER_DEPOSIT
      );
    })
    .reduce((sum, p) => sum + (p.snapshot?.expense || 0), 0);
}

/**
 * Calculates the closing balance based on opening balance, net income, and dividends.
 */
export function calculateClosingBalance(
  openingBalance: number,
  netIncome: number,
  dividends: number,
): number {
  return openingBalance + netIncome - dividends;
}
