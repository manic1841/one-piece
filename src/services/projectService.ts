import { Timestamp, where } from 'firebase/firestore';
import type { Project, ProjectSnapshot } from '@/schemas/project';
import { projectRepository } from '@/repositories/projectRepository';
import { projectSnapshotRepository } from '@/repositories/projectSnapshotRepository';

export interface ProjectWithSnapshot {
  project: Project | null;
  snapshot: ProjectSnapshot | null;
}

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
  async getProjects(householdId: string): Promise<Project[]> {
    const projects = await projectRepository.list([householdId]);

    // Sort in memory by createdAt
    return projects.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;

      // Handle both Timestamp and Date types
      const timeA =
        a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : (a.createdAt as Date).getTime();
      const timeB =
        b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : (b.createdAt as Date).getTime();

      return timeA - timeB;
    });
  }

  /**
   * Get active projects only
   */
  async getActiveProjects(householdId: string): Promise<Project[]> {
    const projects = await projectRepository.list([householdId], [where('isActive', '==', true)]);

    // Sort by order, then by createdAt
    return projects.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      if (!a.createdAt || !b.createdAt) return 0;
      const timeA =
        a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : (a.createdAt as Date).getTime();
      const timeB =
        b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : (b.createdAt as Date).getTime();
      return timeA - timeB;
    });
  }

  /**
   * Get projects by category
   */
  async getProjectsByCategory(
    householdId: string,
    category: string,
    activeOnly: boolean = true,
  ): Promise<Project[]> {
    const q = [where('category', '==', category)];

    if (activeOnly) {
      q.push(where('isActive', '==', true));
    }

    return projectRepository.list([householdId], q);
  }

  /**
   * Get personal projects only
   */
  async getPersonalProjects(householdId: string, activeOnly: boolean = true): Promise<Project[]> {
    const q = [where('isPersonal', '==', true)];

    if (activeOnly) {
      q.push(where('isActive', '==', true));
    }

    return projectRepository.list([householdId], q);
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
    project: Omit<Project, 'id'>,
    userEmail: string,
  ): Promise<string> {
    return projectRepository.create([householdId], project, userEmail);
  }

  /**
   * Update a project
   */
  async updateProject(
    householdId: string,
    projectId: string,
    updates: Partial<Project>,
    userEmail: string,
  ): Promise<void> {
    // Business logic: Validate updates if needed
    // Remove id and createdAt from updates to prevent overwriting
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _createdAt, ...validUpdates } = updates;

    return projectRepository.update([householdId, projectId], validUpdates, userEmail);
  }

  /**
   * Delete a project (hard delete)
   */
  async deleteProject(householdId: string, projectId: string): Promise<void> {
    // Business logic: Could add checks here (e.g., check if project has transactions)
    return projectRepository.delete([householdId, projectId]);
  }

  /**
   * Archive a project (soft delete)
   */
  async archiveProject(householdId: string, projectId: string, userEmail: string): Promise<void> {
    return projectRepository.update([householdId, projectId], { isActive: false }, userEmail);
  }

  /**
   * Restore an archived project
   */
  async restoreProject(householdId: string, projectId: string, userEmail: string): Promise<void> {
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
  ): Promise<void> {
    // Business logic: Batch update orders
    const updatePromises = projectOrders.map(({ id, order }) =>
      projectRepository.update([householdId, id], { order }, userEmail),
    );

    await Promise.all(updatePromises);
  }

  // ==================== ProjectSnapshot Operations ====================

  /**
   * Record a project snapshot
   */
  async recordSnapshot(
    householdId: string,
    projectId: string,
    snapshot: Omit<ProjectSnapshot, 'id' | 'createdAt'>,
    userEmail: string,
  ): Promise<string> {
    // Business logic: Could validate snapshot data here
    // For example, ensure closing balance = opening balance + income - expense
    const calculatedClosingBalance = snapshot.openingBalance + snapshot.income - snapshot.expense;

    if (Math.abs(calculatedClosingBalance - snapshot.closingBalance) > 0.01) {
      console.warn(
        `Snapshot closing balance mismatch: expected ${calculatedClosingBalance}, got ${snapshot.closingBalance}`,
      );
    }

    return projectSnapshotRepository.create([householdId, projectId], snapshot, userEmail);
  }

  /**
   * Get snapshots for a project
   */
  async getSnapshots(
    householdId: string,
    projectId: string,
    year?: number,
    month?: number,
  ): Promise<ProjectSnapshot[]> {
    return projectSnapshotRepository.list(
      [householdId, projectId],
      [where('year', '==', year), where('month', '==', month)],
    );
  }

  /**
   * Get snapshot for a specific project and period
   */
  async getSnapshotForPeriod(
    householdId: string,
    projectId: string,
    year: number,
    month: number,
  ): Promise<ProjectSnapshot | null> {
    const snapshots = await projectSnapshotRepository.list(
      [householdId, projectId],
      [where('year', '==', year), where('month', '==', month)],
    );

    // Return the first snapshot (there should only be one per period)
    return snapshots.length > 0 ? snapshots[0] : null;
  }

  /**
   * Update a project snapshot
   */
  async updateSnapshot(
    householdId: string,
    projectId: string,
    snapshotId: string,
    updates: Partial<Omit<ProjectSnapshot, 'id' | 'createdAt'>>,
    userEmail: string,
  ): Promise<void> {
    return projectSnapshotRepository.update(
      [householdId, projectId, snapshotId],
      updates,
      userEmail,
    );
  }

  /**
   * Delete a project snapshot
   */
  async deleteSnapshot(householdId: string, projectId: string, snapshotId: string): Promise<void> {
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
    const snapshot = await this.getSnapshotForPeriod(householdId, projectId, year, month);
    return { project, snapshot };
  }

  // ==================== Business Logic Methods ====================

  /**
   * Calculate total balance across all projects
   */
  async getTotalBalance(householdId: string): Promise<number> {
    const projects = await this.getActiveProjects(householdId);
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
    const projects = await this.getActiveProjects(householdId);
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
