import { QueryConstraint, orderBy, runTransaction, where } from 'firebase/firestore';

import {
  PlannedIncomeCategory,
  type PlannedIncomeCreate,
  ProjectTransactionCategory,
} from '@/domains/record/types';
import { db } from '@/firebase';
import { plannedIncomeRepository } from '@/repositories/plannedIncomeRepository';
import { type PlannedIncome } from '@/schemas';
import { projectTransactionService } from '@/services/projectTransactionService';

class PlannedIncomeService {
  // Create a new planned income and generate project transactions
  async createPlannedIncome(
    householdId: string,
    data: PlannedIncomeCreate,
    userEmail: string,
  ): Promise<string> {
    return await runTransaction(db, async (transaction) => {
      // 1. Create PlannedIncome document
      const plannedIncomeId = await plannedIncomeRepository.create(
        [householdId],
        data,
        userEmail,
        transaction,
      );

      // 2. Create ProjectTransactions for each allocation
      if (data.allocations) {
        for (const allocation of data.allocations) {
          if (allocation.percentage > 0) {
            const amount = (data.amount * allocation.percentage) / 100;
            await projectTransactionService.createProjectTransaction(
              householdId,
              {
                date: data.date,
                category: ProjectTransactionCategory.ALLOCATION,
                toProjectId: allocation.projectId,
                amount: amount,
                description: `Allocation from ${data.category}: ${data.description || ''}`,
                incomeSource: plannedIncomeId,
              },
              userEmail,
              transaction, // Pass transaction to ensure atomicity
            );
          }
        }
      }

      return plannedIncomeId;
    });
  }

  // Get planned incomes
  async getPlannedIncomes(
    householdId: string,
    filters?: { startDate?: Date; endDate?: Date; category?: PlannedIncomeCategory },
  ): Promise<PlannedIncome[]> {
    const q: QueryConstraint[] = [orderBy('date', 'desc')];
    if (filters?.startDate) {
      q.push(where('date', '>=', filters.startDate));
    }
    if (filters?.endDate) {
      q.push(where('date', '<=', filters.endDate));
    }
    if (filters?.category) {
      q.push(where('category', '==', filters.category));
    }
    return plannedIncomeRepository.list([householdId], q);
  }

  // Get latest planned income by category to retrieve user settings/defaults
  async getLatestPlannedIncomeByCategory(
    householdId: string,
    category: PlannedIncomeCategory,
  ): Promise<PlannedIncome | null> {
    const results = await plannedIncomeRepository.list(
      [householdId],
      [
        where('category', '==', category),
        orderBy('date', 'desc'),
        orderBy('createdAt', 'desc'), // Tie-breaker
      ],
    );

    return results.length > 0 ? results[0] : null;
  }

  // Update a planned income and related project transactions
  async updatePlannedIncome(
    householdId: string,
    plannedIncomeId: string,
    data: Partial<PlannedIncomeCreate>,
    userEmail: string,
  ): Promise<void> {
    // If allocations are being updated, we need to update projectTransactions too
    if (data.allocations) {
      await runTransaction(db, async (transaction) => {
        // 1. Get the planned income to determine the amount
        const currentPlannedIncome = await plannedIncomeRepository.get([
          householdId,
          plannedIncomeId,
        ]);

        if (currentPlannedIncome === null) {
          throw new Error('Planned income not found');
        }

        const amount = data.amount ?? currentPlannedIncome.amount;
        const date = data.date ?? currentPlannedIncome.date;
        const category = data.category ?? currentPlannedIncome.category;
        const description = data.description ?? currentPlannedIncome.description;

        // 2. Delete old project transactions
        const oldTransactions =
          await projectTransactionService.getProjectTransactionsByIncomeSource(
            householdId,
            plannedIncomeId,
          );

        await projectTransactionService.deleteProjectTransactions(
          householdId,
          oldTransactions.map((t) => t.id),
          transaction,
        );

        // 3. Create new project transactions based on updated allocations
        const allocations = data.allocations!;
        for (const allocation of allocations) {
          if (allocation.percentage > 0) {
            const allocationAmount = (amount * allocation.percentage) / 100;
            await projectTransactionService.createProjectTransaction(
              householdId,
              {
                date,
                category: ProjectTransactionCategory.ALLOCATION,
                toProjectId: allocation.projectId,
                amount: allocationAmount,
                description: `Allocation from ${category}: ${description || ''}`,
                incomeSource: plannedIncomeId,
              },
              userEmail,
              transaction,
            );
          }
        }

        // 4. Update the planned income document
        await plannedIncomeRepository.update(
          [householdId, plannedIncomeId],
          data,
          userEmail,
          transaction,
        );
      });
    } else {
      // No allocation changes, just update the planned income
      return plannedIncomeRepository.update([householdId, plannedIncomeId], data, userEmail);
    }
  }

  // Delete a planned income and related project transactions
  async deletePlannedIncome(householdId: string, plannedIncomeId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      // 1. Delete related project transactions
      const relatedTransactions =
        await projectTransactionService.getProjectTransactionsByIncomeSource(
          householdId,
          plannedIncomeId,
        );

      await projectTransactionService.deleteProjectTransactions(
        householdId,
        relatedTransactions.map((t) => t.id),
        transaction,
      );

      // 2. Delete the planned income
      await plannedIncomeRepository.delete([householdId, plannedIncomeId], transaction);
    });
  }
}

export const plannedIncomeService = new PlannedIncomeService();
