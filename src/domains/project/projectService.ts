import { type Project } from '@/domains/project/schemas';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export class ProjectService {
  /**
   * Archive a project after verifying no transactions in the current month.
   */
  async archiveProject(householdId: string, projectId: string, userEmail: string): Promise<void> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    const recentTransactions = await transactionRepository.getTransactionsByProject(
      householdId,
      projectId,
      yearMonth,
    );

    if (recentTransactions.length > 0) {
      throw new Error('Cannot archive project with active transactions in the current month.');
    }

    await projectRepository.archiveProject(householdId, projectId, userEmail);
  }

  /**
   * Get a project by its ID.
   */
  async getProjectById(householdId: string, projectId: string): Promise<Project | null> {
    return projectRepository.get([householdId, projectId]);
  }

  /**
   * Transfer balance between projects directly in snapshots.
   */
  async transferBetweenProjects(
    householdId: string,
    input: {
      fromProjectId: string;
      toProjectId: string;
      amount: number;
      date?: Date;
      description?: string;
    },
    userEmail: string,
  ): Promise<void> {
    const { fromProjectId, toProjectId, amount, date, description } = input;

    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than zero.');
    }

    if (fromProjectId === toProjectId) {
      throw new Error('Source and target projects must be different.');
    }

    await transactionRepository.create(
      [householdId],
      {
        date: date || new Date(),
        description: description || 'Project Transfer',
        intentType: 'TRANSFER',
        amount,
        fromProjectId,
        toProjectId,
        createdBy: userEmail,
        entries: [], // Project transfers don't necessarily need journal entries if they are management-only, but the schema requires it.
        // However, for project accounting, we track them via from/toProjectId.
      },
      userEmail,
    );
  }
}

export const projectService = new ProjectService();
