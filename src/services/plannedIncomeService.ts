import { runTransaction, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { type PlannedIncome } from '../schemas';
import { projectTransactionService } from './projectTransactionService';
import { plannedIncomeRepository } from '../repositories/plannedIncomeRepository';

export const plannedIncomeService = {
  // Create a new planned income and generate project transactions
  async createPlannedIncome(
    householdId: string,
    data: Omit<PlannedIncome, 'id' | 'createdAt'>,
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
                type: 'allocation',
                toProject: allocation.projectId,
                amount: amount,
                description: `Allocation from ${data.category}: ${data.description || ''}`,
                incomeSource: plannedIncomeId,
                createdBy: data.createdBy,
              },
              userEmail,
              transaction, // Pass transaction to ensure atomicity
            );
          }
        }
      }

      return plannedIncomeId;
    });
  },

  // Get planned incomes
  async getPlannedIncomes(householdId: string): Promise<PlannedIncome[]> {
    return plannedIncomeRepository.list([householdId], [orderBy('date', 'desc')]);
  },

  // Get planned incomes for a specific period
  async getPlannedIncomesForPeriod(
    householdId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PlannedIncome[]> {
    return plannedIncomeRepository.list(
      [householdId],
      [where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date', 'desc')],
    );
  },

  // Get latest planned income by category to retrieve user settings/defaults
  async getLatestPlannedIncomeByCategory(
    householdId: string,
    category: string,
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
  },

  // Update a planned income and related project transactions
  async updatePlannedIncome(
    householdId: string,
    plannedIncomeId: string,
    data: Partial<Omit<PlannedIncome, 'id' | 'createdAt'>>,
    userEmail: string,
  ): Promise<void> {
    // If allocations are being updated, we need to update projectTransactions too
    if (data.allocations) {
      await runTransaction(db, async (transaction) => {
        // 1. Get the planned income to determine the amount
        const plannedIncomeRef = plannedIncomeRepository.getDocRefForTransaction(
          householdId,
          plannedIncomeId,
        );
        const plannedIncomeDoc = await transaction.get(plannedIncomeRef);

        if (!plannedIncomeDoc.exists()) {
          throw new Error('Planned income not found');
        }

        const currentPlannedIncome = plannedIncomeDoc.data() as PlannedIncome;
        const amount = data.amount ?? currentPlannedIncome.amount;
        const date = data.date ?? currentPlannedIncome.date;
        const category = data.category ?? currentPlannedIncome.category;
        const description = data.description ?? currentPlannedIncome.description;
        const createdBy = data.createdBy ?? currentPlannedIncome.createdBy;

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
        const allocations = data.allocations!; // Non-null assertion - we already checked in outer if
        for (const allocation of allocations) {
          if (allocation.percentage > 0) {
            const allocationAmount = (amount * allocation.percentage) / 100;
            await projectTransactionService.createProjectTransaction(
              householdId,
              {
                date,
                type: 'allocation',
                toProject: allocation.projectId,
                amount: allocationAmount,
                description: `Allocation from ${category}: ${description || ''}`,
                incomeSource: plannedIncomeId,
                createdBy,
              },
              transaction,
            );
          }
        }

        // 4. Update the planned income document
        transaction.update(plannedIncomeRef, data);
      });
    } else {
      // No allocation changes, just update the planned income
      return plannedIncomeRepository.update([householdId, plannedIncomeId], data, userEmail);
    }
  },

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
      const plannedIncomeRef = plannedIncomeRepository.getDocRefForTransaction(
        householdId,
        plannedIncomeId,
      );
      transaction.delete(plannedIncomeRef);
    });
  },
};
