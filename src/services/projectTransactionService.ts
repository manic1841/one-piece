import {
  orderBy,
  where,
  type QueryConstraint,
  type Transaction as FirestoreTransaction,
} from 'firebase/firestore';
import { type ProjectTransaction } from '@/schemas';
import { projectTransactionRepository } from '@/repositories/projectTransactionRepository';
import { type ExcludedColumn } from '@/repositories/baseRepository';

class ProjectTransactionService {
  // Create a new project transaction
  // Supports running within an existing Firestore transaction
  async createProjectTransaction(
    householdId: string,
    data: Omit<ProjectTransaction, ExcludedColumn>,
    userEmail: string,
    transaction?: FirestoreTransaction,
  ): Promise<string> {
    return projectTransactionRepository.create([householdId], data, userEmail, transaction);
  }

  // Get project transactions
  async getProjectTransactions(
    householdId: string,
    filters?: {
      projectId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<ProjectTransaction[]> {
    const constraints: QueryConstraint[] = [orderBy('date', 'desc')];

    if (filters?.projectId) {
      // Note: This requires a composite index: projectId ASC, date DESC
      constraints.push(where('toProject', '==', filters.projectId));
    }

    if (filters?.startDate) {
      constraints.push(where('date', '>=', filters.startDate));
    }

    if (filters?.endDate) {
      constraints.push(where('date', '<=', filters.endDate));
    }

    return projectTransactionRepository.list([householdId], constraints);
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
    data: Partial<Omit<ProjectTransaction, ExcludedColumn>>,
    userEmail: string,
  ): Promise<void> {
    return projectTransactionRepository.update([householdId, id], data, userEmail);
  }

  // Delete project transactions by IDs
  // Supports running within an existing Firestore transaction
  async deleteProjectTransactions(
    householdId: string,
    transactionIds: string[],
    transaction?: FirestoreTransaction,
  ): Promise<void> {
    transactionIds.forEach((id) => {
      projectTransactionRepository.delete([householdId, id], transaction);
    });
  }
}

export const projectTransactionService = new ProjectTransactionService();
