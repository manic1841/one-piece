import { Timestamp, where } from 'firebase/firestore';

import { type UnsettledItem, type UnsettledStats } from '@/domains/finance/types/TrendData';
import { projectSnapshotRepository } from '@/repositories/projectSnapshotRepository';
import { type ProjectSnapshot, type ProjectTransaction, type Transaction } from '@/schemas';

import { accountService } from './accountService';
import { type AuthContext, householdService } from './householdService';
import { portfolioService } from './portfolioService';
import { projectService } from './projectService';
import { projectTransactionService } from './projectTransactionService';
import { transactionService } from './transactionService';

export interface SettlementPreview {
  projectId: string;
  projectName: string;
  projectIcon: string;
  projectColor: string;
  lastSnapshot: {
    year: number;
    month: number;
    balance: number;
  } | null;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
  hasExistingSnapshot: boolean;
}

class SettlementService {
  /**
   * Get the previous month's year and month
   */
  private getPreviousMonth(year: number, month: number): { year: number; month: number } {
    if (month === 1) {
      return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
  }

  /**
   * Check if a snapshot exists for a specific month
   */
  async checkExistingSnapshot(
    householdId: string,
    projectId: string,
    year: number,
    month: number,
  ): Promise<boolean> {
    const snapshotId = projectSnapshotRepository.buildId(year, month);
    const snapshot = await projectSnapshotRepository.get([householdId, projectId, snapshotId]);
    return snapshot !== null;
  }

  /**
   * Get the latest snapshot for a project
   */
  async getLatestSnapshot(householdId: string, projectId: string): Promise<ProjectSnapshot | null> {
    const snapshots = await projectSnapshotRepository.list(
      [householdId, projectId],
      [
        where('year', '==', new Date().getFullYear()),
        where('month', '==', new Date().getMonth() + 1),
      ],
    );
    return snapshots.length > 0 ? snapshots[0] : null;
  }

  /**
   * Calculate monthly settlement for a single project
   */
  async calculateMonthlySettlement(
    householdId: string,
    projectId: string,
    projectName: string,
    projectIcon: string,
    projectColor: string,
    year: number,
    month: number,
  ): Promise<SettlementPreview> {
    // Check if snapshot already exists
    const hasExistingSnapshot = await this.checkExistingSnapshot(
      householdId,
      projectId,
      year,
      month,
    );

    // Get previous month's snapshot
    const prevMonth = this.getPreviousMonth(year, month);
    const prevSnapshots = await projectSnapshotRepository.list(
      [householdId, projectId],
      [where('year', '==', prevMonth.year), where('month', '==', prevMonth.month)],
    );
    const prevSnapshot = prevSnapshots.length > 0 ? prevSnapshots[0] : null;
    const openingBalance = prevSnapshot?.closingBalance || 0;

    // Get all project transactions and regular transactions
    const [projectTransactions, transactions] = await Promise.all([
      projectTransactionService.getProjectTransactions(householdId),
      transactionService.getTransactions(householdId),
    ]);

    // Calculate income (projectTransactions and transactions to this project in this month)
    const incomeProjectTrans = projectTransactions
      .filter((pt: ProjectTransaction) => {
        const ptDate = pt.date instanceof Timestamp ? pt.date.toDate() : pt.date;
        return (
          pt.toProjectId === projectId &&
          ptDate.getFullYear() === year &&
          ptDate.getMonth() + 1 === month
        );
      })
      .reduce((sum: number, pt: ProjectTransaction) => sum + pt.amount, 0);
    const incomeTrans = transactions
      .filter((t: Transaction) => {
        const tDate = t.date instanceof Timestamp ? t.date.toDate() : t.date;
        return (
          t.projectId === projectId &&
          t.type === 'income' &&
          tDate.getFullYear() === year &&
          tDate.getMonth() + 1 === month
        );
      })
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const income = incomeProjectTrans + incomeTrans;

    // Calculate expense (transactions for this project in this month)
    const expense = transactions
      .filter((t: Transaction) => {
        const tDate = t.date instanceof Timestamp ? t.date.toDate() : t.date;
        return (
          t.projectId === projectId &&
          t.type === 'expense' &&
          tDate.getFullYear() === year &&
          tDate.getMonth() + 1 === month
        );
      })
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    // Calculate closing balance
    const closingBalance = openingBalance + income - expense;

    return {
      projectId,
      projectName,
      projectIcon,
      projectColor,
      lastSnapshot: prevSnapshot
        ? {
            year: prevSnapshot.year,
            month: prevSnapshot.month,
            balance: prevSnapshot.closingBalance,
          }
        : null,
      openingBalance,
      income,
      expense,
      closingBalance,
      hasExistingSnapshot,
    };
  }

  /**
   * Calculate settlement preview for all projects
   */
  async calculateAllSettlements(
    householdId: string,
    projects: Array<{ id: string; name: string; icon: string; color: string }>,
    year: number,
    month: number,
  ): Promise<SettlementPreview[]> {
    const settlements = await Promise.all(
      projects.map((project) =>
        this.calculateMonthlySettlement(
          householdId,
          project.id,
          project.name,
          project.icon,
          project.color,
          year,
          month,
        ),
      ),
    );
    return settlements;
  }

  /**
   * Batch create settlements for all projects
   */
  async batchCreateSettlement(
    householdId: string,
    year: number,
    month: number,
    settlements: SettlementPreview[],
    userEmail: string,
    auth: AuthContext,
  ): Promise<{ success: boolean; errors: string[] }> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    // Check for existing snapshots
    const existingProjects = settlements.filter((s) => s.hasExistingSnapshot);
    if (existingProjects.length > 0) {
      return {
        success: false,
        errors: [
          `The following projects already have snapshots for ${year}-${month}: ${existingProjects.map((p) => p.projectName).join(', ')}`,
        ],
      };
    }

    // Create all snapshots
    try {
      await Promise.all(
        settlements.map((settlement) => {
          const customId = projectSnapshotRepository.buildId(year, month);
          projectSnapshotRepository.create(
            [householdId, settlement.projectId],
            {
              year,
              month,
              openingBalance: settlement.openingBalance,
              income: settlement.income,
              expense: settlement.expense,
              closingBalance: settlement.closingBalance,
            },
            userEmail,
            undefined,
            customId,
          );
        }),
      );
      return { success: true, errors: [] };
    } catch (error) {
      console.error('Error creating settlements:', error);
      return {
        success: false,
        errors: ['Failed to create settlements. Please try again.'],
      };
    }
  }
  /**
   * Get unsettled items for a specific month
   */
  async getUnsettledStats(
    householdId: string,
    targetYear?: number,
    targetMonth?: number,
  ): Promise<UnsettledStats> {
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = targetYear ?? prevMonthDate.getFullYear();
    const month = targetMonth ?? prevMonthDate.getMonth() + 1;

    const [projects, accounts, portfolios] = await Promise.all([
      projectService.getProjects(householdId),
      accountService.getAccounts(householdId),
      portfolioService.getPortfolios(householdId),
    ]);

    const unsettledProjects: UnsettledItem[] = [];
    const unsettledAccounts: UnsettledItem[] = [];
    const unsettledPortfolios: UnsettledItem[] = [];

    // Check Projects
    for (const project of projects) {
      if (!project.isActive) continue;
      const exists = await this.checkExistingSnapshot(householdId, project.id, year, month);
      if (!exists) {
        unsettledProjects.push({ id: project.id, name: project.name, type: 'project' });
      }
    }

    // Check Accounts
    for (const account of accounts) {
      const snapshots = await accountService.getSnapshots(householdId, account.id, year, month);
      if (snapshots.length === 0) {
        unsettledAccounts.push({ id: account.id, name: account.name, type: 'account' });
      }
    }

    // Check Portfolios
    for (const portfolio of portfolios) {
      if (!portfolio.isActive) continue;
      const snapshots = await portfolioService.getSnapshots(householdId, portfolio.id, year, month);
      if (snapshots.length === 0) {
        unsettledPortfolios.push({ id: portfolio.id, name: portfolio.name, type: 'portfolio' });
      }
    }

    return {
      year,
      month,
      unsettledProjects,
      unsettledAccounts,
      unsettledPortfolios,
      totalUnsettled:
        unsettledProjects.length + unsettledAccounts.length + unsettledPortfolios.length,
    };
  }
}

export const settlementService = new SettlementService();
