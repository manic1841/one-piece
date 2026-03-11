import { QueryConstraint, type Transaction, limit, orderBy, where } from 'firebase/firestore';

import { calculateBalance } from '@/domains/project/calculator';
import type {
  Project,
  ProjectCreate,
  ProjectSnapshot,
  ProjectSnapshotCreate,
} from '@/domains/project/types';
import type { ProjectWithSnapshot } from '@/domains/project/types';
import { projectRepository } from '@/repositories/projectRepository';
import { projectSnapshotRepository } from '@/repositories/projectSnapshotRepository';
import { projectTransactionService } from '@/services/projectTransactionService';
import { transactionService } from '@/services/transactionService';

import { type AuthContext, householdService } from './householdService';

export type { ProjectWithSnapshot };

/**
 * ProjectService
 * Business logic layer for Project operations
 * Delegates data access to ProjectRepository
 */
class ProjectService {
  /**
   * Get all projects for a household
   * Sorted by createdAt (oldest first)
   */
  async getProjects(
    householdId: string,
    filters?: {
      isActive?: boolean;
      category?: string;
    },
  ): Promise<Project[]> {
    const q: QueryConstraint[] = [];

    if (filters?.isActive) {
      q.push(where('isActive', '==', filters.isActive));
    }
    if (filters?.category) {
      q.push(where('category', '==', filters.category));
    }

    const projects = await projectRepository.list([householdId], [orderBy('order', 'asc')]);
    return projects;
  }

  /**
   * Get a single project by ID
   */
  async getProjectById(householdId: string, projectId: string): Promise<Project | null> {
    return projectRepository.get([householdId, projectId]);
  }

  /**
   * Create a new project
   */
  async createProject(
    householdId: string,
    project: ProjectCreate,
    userEmail: string,
    auth: AuthContext,
  ): Promise<string> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return projectRepository.create([householdId], project, userEmail);
  }

  /**
   * Update a project
   */
  async updateProject(
    householdId: string,
    projectId: string,
    updates: Partial<ProjectCreate>,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return projectRepository.update([householdId, projectId], updates, userEmail);
  }

  /**
   * Delete a project (hard delete)
   */
  async deleteProject(householdId: string, projectId: string, auth: AuthContext): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    // Business logic: Could add checks here (e.g., check if project has transactions)
    return projectRepository.delete([householdId, projectId]);
  }

  /**
   * Archive a project (soft delete)
   */
  async archiveProject(
    householdId: string,
    projectId: string,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return projectRepository.update([householdId, projectId], { isActive: false }, userEmail);
  }

  /**
   * Restore an archived project
   */
  async restoreProject(
    householdId: string,
    projectId: string,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return projectRepository.update([householdId, projectId], { isActive: true }, userEmail);
  }

  /**
   * Reorder projects
   * Updates the order field for multiple projects
   */
  async reorderProjects(
    householdId: string,
    projectOrders: Array<{ id: string; order: number }>,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    // Business logic: Batch update orders
    const updatePromises = projectOrders.map(({ id, order }) =>
      projectRepository.update([householdId, id], { order }, userEmail),
    );

    await Promise.all(updatePromises);
  }

  async getRecords(householdId: string, projectId: string) {
    const transactions = await transactionService.getTransactions(householdId, { projectId });
    const projectTransactions = await projectTransactionService.getProjectTransactionsForProject(
      householdId,
      projectId,
    );

    return [...transactions, ...projectTransactions];
  }

  // ==================== ProjectSnapshot Operations ====================

  /**
   * Record a project snapshot
   */
  async recordSnapshot(
    householdId: string,
    projectId: string,
    snapshot: ProjectSnapshotCreate,
    userEmail: string,
    auth: AuthContext,
    tx?: Transaction,
  ): Promise<string> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin, tx);
    // Business logic: Could validate snapshot data here
    // For example, ensure closing balance = opening balance + income - expense
    const calculatedClosingBalance = snapshot.openingBalance + snapshot.income - snapshot.expense;

    if (Math.abs(calculatedClosingBalance - snapshot.closingBalance) > 0.01) {
      console.warn(
        `Snapshot closing balance mismatch: expected ${calculatedClosingBalance}, got ${snapshot.closingBalance}`,
      );
    }

    const customId = projectSnapshotRepository.buildId(snapshot.year, snapshot.month);
    return projectSnapshotRepository.create(
      [householdId, projectId],
      snapshot,
      userEmail,
      tx,
      customId,
    );
  }

  /**
   * Get snapshots for a project
   */
  async getSnapshots(
    householdId: string,
    projectId: string,
    filters?: {
      year?: number;
      month?: number;
    },
  ): Promise<ProjectSnapshot[]> {
    const q: QueryConstraint[] = [];
    if (filters?.year) {
      q.push(where('year', '==', filters.year));
    }
    if (filters?.month) {
      q.push(where('month', '==', filters.month));
    }

    return projectSnapshotRepository.list([householdId, projectId], q);
  }

  /**
   * Get snapshot for a specific project and period
   */
  async getSnapshotForPeriod(
    householdId: string,
    projectId: string,
    year: number,
    month: number,
    tx?: Transaction,
  ): Promise<ProjectSnapshot | null> {
    const snapshotId = projectSnapshotRepository.buildId(year, month);
    return projectSnapshotRepository.get([householdId, projectId, snapshotId], tx);
  }

  async getLatestSnapshot(householdId: string, projectId: string): Promise<ProjectSnapshot | null> {
    const snapshots = await projectSnapshotRepository.list(
      [householdId, projectId],
      [orderBy('year', 'desc'), orderBy('month', 'desc'), limit(1)],
    );
    return snapshots.length > 0 ? snapshots[0] : null;
  }

  /**
   * Update a project snapshot
   */
  async updateSnapshot(
    householdId: string,
    projectId: string,
    snapshotId: string,
    updates: Partial<ProjectSnapshotCreate>,
    userEmail: string,
    auth: AuthContext,
    tx?: Transaction,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin, tx);
    return projectSnapshotRepository.update(
      [householdId, projectId, snapshotId],
      updates,
      userEmail,
      tx,
    );
  }

  /**
   * Delete a project snapshot
   */
  async deleteSnapshot(
    householdId: string,
    projectId: string,
    snapshotId: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return projectSnapshotRepository.delete([householdId, projectId, snapshotId]);
  }

  /**
   * Get project with its snapshot for a specific period
   */
  async getProjectWithSnapshot(
    householdId: string,
    projectId: string,
    year: number,
    month: number,
  ): Promise<ProjectWithSnapshot> {
    const project = await this.getProjectById(householdId, projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    const snapshot = await this.getSnapshotForPeriod(householdId, projectId, year, month);
    return { ...project, snapshot };
  }

  // ==================== Business Logic Methods ====================

  async getProjectBalance(
    householdId: string,
    projectId: string,
  ): Promise<{ balance: number; year?: number; month?: number }> {
    const snapshot = await this.getLatestSnapshot(householdId, projectId);
    const snapshotDate = snapshot ? new Date(snapshot.year, snapshot.month) : null;
    const tnxs = await transactionService.getTransactions(householdId, {
      startDate: snapshotDate || new Date(0),
      endDate: new Date(),
      projectId,
    });
    const pts = await projectTransactionService.getProjectTransactionsForPeriod(
      householdId,
      snapshotDate || new Date(0),
      new Date(),
      projectId,
    );

    const balance = calculateBalance(snapshot ? snapshot.closingBalance : 0, projectId, tnxs, pts);
    return {
      balance,
      year: snapshot?.year,
      month: snapshot?.month,
    };
  }

  /**
   * Calculate total balance across all projects
   */
  async getTotalBalance(householdId: string): Promise<number> {
    const projects = await this.getProjects(householdId, { isActive: true });
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let totalBalance = 0;

    for (const project of projects) {
      const snapshot = await this.getSnapshotForPeriod(householdId, project.id, year, month);

      if (snapshot) {
        totalBalance += snapshot.closingBalance;
      }
    }

    return totalBalance;
  }

  /**
   * Get projects with accounting enabled
   */
  async getAccountingProjects(householdId: string): Promise<Project[]> {
    const projects = await this.getProjects(householdId, { isActive: true });
    return projects.filter((p) => p.accounting?.enabled);
  }

  /**
   * Get projects by balance sheet category
   */
  async getProjectsByBalanceSheetCategory(
    householdId: string,
    category: 'asset' | 'liability' | 'equity',
  ): Promise<Project[]> {
    const projects = await this.getAccountingProjects(householdId);
    return projects.filter((p) => p.accounting?.balanceSheet?.category === category);
  }

  /**
   * Get projects by cash flow activity
   */
  async getProjectsByCashFlowActivity(
    householdId: string,
    activity: 'operating' | 'investing' | 'financing' | 'reconciliation',
  ): Promise<Project[]> {
    const projects = await this.getAccountingProjects(householdId);
    return projects.filter((p) => p.accounting?.cashFlow?.category === activity);
  }
}

export const projectService = new ProjectService();
