import { type DebtSnapshotCreate } from '@/domains/debt/schemas';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { type ProjectSnapshotCreate } from './schemas';

export class SettlementService {
  /**
   * Recalculate and save snapshots for all active projects for a given month.
   */
  async settleProjects(householdId: string, yearMonth: string, userEmail: string): Promise<void> {
    // 1. Settle Projects
    const projects = await projectRepository.getProjects(householdId);
    for (const project of projects) {
      const snapshot = await this.recalculateSnapshot(householdId, project.id, yearMonth);
      await projectRepository.saveSnapshot(householdId, project.id, snapshot, userEmail);
    }
  }

  /**
   * Ensure all active debt accounts have a snapshot for the month.
   */
  async settleDebtAccounts(
    householdId: string,
    yearMonth: string,
    userEmail: string,
  ): Promise<void> {
    const debtAccounts = await debtAccountRepository.getDebtAccounts(householdId);

    for (const account of debtAccounts) {
      // Check if snapshot already exists (e.g. from a payment)
      const existing = await debtSnapshotRepository.getSnapshot(householdId, account.id, yearMonth);
      if (existing) continue;

      // If no payment, create one with zero paid amounts
      const snapshot: DebtSnapshotCreate = {
        yearMonth,
        openingBalance: account.currentBalance, // Simplified: should ideally fetch from previous month if complex
        principalPaid: 0,
        interestPaid: 0,
        totalPaid: 0,
        closingBalance: account.currentBalance,
      };

      await debtSnapshotRepository.upsertSnapshot(householdId, account.id, snapshot, userEmail);
    }
  }

  /**
   * Pre-calculate snapshots for all projects for preview purposes.
   */
  async calculateAllSettlements(
    householdId: string,
    projects: { id: string; name: string }[],
    year: number,
    month: number,
  ): Promise<(ProjectSnapshotCreate & { projectId: string; projectName: string })[]> {
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    const previews = [];

    for (const project of projects) {
      const snapshot = await this.recalculateSnapshot(householdId, project.id, yearMonth);
      previews.push({
        projectId: project.id,
        projectName: project.name,
        ...snapshot,
      });
    }

    return previews;
  }

  /**
   * Calculate the snapshot for a specific project and month.
   */
  async recalculateSnapshot(
    householdId: string,
    projectId: string,
    yearMonth: string,
  ): Promise<ProjectSnapshotCreate> {
    const [year, month] = yearMonth.split('-').map(Number);

    // 1. Get opening balance from previous month
    const prevYearMonth = this.getPreviousYearMonth(year, month);
    const prevSnapshot = await projectRepository.getSnapshot(householdId, projectId, prevYearMonth);
    const openingBalance = prevSnapshot?.closingBalance ?? 0;

    // 2. Get Income: Allocations + TRANSFER to this project
    const [allocations, transfers] = await Promise.all([
      allocationRepository.getAllocationsByMonth(householdId, yearMonth),
      transactionRepository.getProjectTransfers(householdId, yearMonth),
    ]);

    const incomeFromAllocations = allocations
      .filter((allocation) => allocation.direction !== 'EXPENSE')
      .flatMap((a) => a.items)
      .filter((item) => item.projectId === projectId)
      .reduce((sum, item) => sum + item.amount, 0);

    const expenseFromAllocations = allocations
      .filter((allocation) => allocation.direction === 'EXPENSE')
      .flatMap((a) => a.items)
      .filter((item) => item.projectId === projectId)
      .reduce((sum, item) => sum + item.amount, 0);

    const incomeFromTransfers = transfers
      .filter((t) => t.toProjectId === projectId)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalIncome = incomeFromAllocations + incomeFromTransfers;

    // 3. Get Expense: Project transactions + TRANSFER from this project
    const projectTransactions = await transactionRepository.getTransactionsByProject(
      householdId,
      projectId,
      yearMonth,
    );

    const directExpenses = projectTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    const expenseFromTransfers = transfers
      .filter((t) => t.fromProjectId === projectId)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalExpense = directExpenses + expenseFromTransfers + expenseFromAllocations;

    // 4. Calculate closing balance
    const closingBalance = openingBalance + totalIncome - totalExpense;

    return {
      year,
      month,
      openingBalance,
      income: totalIncome,
      expense: totalExpense,
      closingBalance,
    };
  }

  private getPreviousYearMonth(year: number, month: number): string {
    let pYear = year;
    let pMonth = month - 1;
    if (pMonth === 0) {
      pMonth = 12;
      pYear -= 1;
    }
    return `${pYear}-${pMonth.toString().padStart(2, '0')}`;
  }
}

export const settlementService = new SettlementService();
