import {
  type Transaction as FirestoreTransaction,
  type QueryConstraint,
  orderBy,
  where,
} from 'firebase/firestore';

import { projectTransactionRepository } from '@/repositories/projectTransactionRepository';
import { type ProjectTransaction, type ProjectTransactionCreate } from '@/schemas';

import { type AuthContext, householdService } from './householdService';

class ProjectTransactionService {
  // Create a new project transaction
  // Supports running within an existing Firestore transaction
  async createProjectTransaction(
    householdId: string,
    data: ProjectTransactionCreate,
    userEmail: string,
    auth: AuthContext,
    transaction?: FirestoreTransaction,
  ): Promise<string> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return projectTransactionRepository.create([householdId], data, userEmail, transaction);
  }

  // Get project transactions
  async getProjectTransactions(
    householdId: string,
    filters?: {
      toProjectId?: string;
      fromProjectId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<ProjectTransaction[]> {
    const constraints: QueryConstraint[] = [orderBy('date', 'desc')];

    if (filters?.toProjectId) {
      // Note: This requires a composite index: toProjectId ASC, date DESC
      constraints.push(where('toProjectId', '==', filters.toProjectId));
    }

    if (filters?.fromProjectId) {
      // Note: This requires a composite index: fromProjectId ASC, date DESC
      constraints.push(where('fromProjectId', '==', filters.fromProjectId));
    }

    if (filters?.startDate) {
      constraints.push(where('date', '>=', filters.startDate));
    }

    if (filters?.endDate) {
      constraints.push(where('date', '<=', filters.endDate));
    }

    return projectTransactionRepository.list([householdId], constraints);
  }

  async getProjectTransactionsForPeriod(
    householdId: string,
    startDate: Date,
    endDate: Date,
    projectId?: string,
  ): Promise<ProjectTransaction[]> {
    if (projectId) {
      const toData = await this.getProjectTransactions(householdId, {
        startDate,
        endDate,
        toProjectId: projectId,
      });
      const fromData = await this.getProjectTransactions(householdId, {
        startDate,
        endDate,
        fromProjectId: projectId,
      });

      return toData.concat(fromData);
    }

    return this.getProjectTransactions(householdId, {
      startDate,
      endDate,
    });
  }

  async getProjectTransactionsForProject(
    householdId: string,
    projectId: string,
  ): Promise<ProjectTransaction[]> {
    const dataTo = await this.getProjectTransactions(householdId, {
      toProjectId: projectId,
    });
    const dataFrom = await this.getProjectTransactions(householdId, {
      fromProjectId: projectId,
    });
    return dataTo.concat(dataFrom);
  }

  // Get project transactions by income source (plannedIncomeId)
  async getProjectTransactionsByIncomeSource(
    householdId: string,
    incomeSource: string,
  ): Promise<ProjectTransaction[]> {
    return projectTransactionRepository.list(
      [householdId],
      [where('incomeSource', '==', incomeSource)],
    );
  }

  // Update project transaction
  async updateProjectTransaction(
    householdId: string,
    id: string,
    data: Partial<ProjectTransactionCreate>,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return projectTransactionRepository.update([householdId, id], data, userEmail);
  }

  // Delete project transactions by IDs
  // Supports running within an existing Firestore transaction
  async deleteProjectTransactions(
    householdId: string,
    transactionIds: string[],
    auth: AuthContext,
    transaction?: FirestoreTransaction,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    transactionIds.forEach((id) => {
      projectTransactionRepository.delete([householdId, id], transaction);
    });
  }
}

export const projectTransactionService = new ProjectTransactionService();
