import { projectSnapshotRepository } from '@/repositories/projectSnapshotRepository';
import { Timestamp, where } from 'firebase/firestore';

import { type ProjectSnapshot } from '../schemas';
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
    const snapshots = await projectSnapshotRepository.list(
      [householdId, projectId],
      [where('year', '==', year), where('month', '==', month)],
    );
    console.log('snapshots', snapshots);
    return snapshots.length > 0;
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
      .filter((pt) => {
        const ptDate = pt.date instanceof Timestamp ? pt.date.toDate() : pt.date;
        return (
          pt.toProjectId === projectId &&
          ptDate.getFullYear() === year &&
          ptDate.getMonth() + 1 === month
        );
      })
      .reduce((sum, pt) => sum + pt.amount, 0);
    const incomeTrans = transactions
      .filter((t) => {
        const tDate = t.date instanceof Timestamp ? t.date.toDate() : t.date;
        return (
          t.projectId === projectId &&
          t.type === 'income' &&
          tDate.getFullYear() === year &&
          tDate.getMonth() + 1 === month
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);
    const income = incomeProjectTrans + incomeTrans;

    // Calculate expense (transactions for this project in this month)
    const expense = transactions
      .filter((t) => {
        const tDate = t.date instanceof Timestamp ? t.date.toDate() : t.date;
        return (
          t.projectId === projectId &&
          t.type === 'expense' &&
          tDate.getFullYear() === year &&
          tDate.getMonth() + 1 === month
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);

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
  ): Promise<{ success: boolean; errors: string[] }> {
    console.log('settlements', settlements);
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
        settlements.map((settlement) =>
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
          ),
        ),
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
}

export const settlementService = new SettlementService();
