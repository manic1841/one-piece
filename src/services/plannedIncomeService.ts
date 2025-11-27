import {
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';
import { PlannedIncomeSchema, type PlannedIncome } from '../schemas';
import { projectTransactionService } from './projectTransactionService';
import { BaseService } from './baseService';

class PlannedIncomeService extends BaseService<PlannedIncome> {
  constructor() {
    super('plannedIncome', PlannedIncomeSchema);
  }

  // Create a new planned income and generate project transactions
  // Overriding to use transaction
  async createPlannedIncome(
    householdId: string,
    data: Omit<PlannedIncome, 'id' | 'createdAt'>,
  ): Promise<string> {
    return await runTransaction(db, async (transaction) => {
      // 1. Create PlannedIncome document
      const plannedIncomeRef = doc(this.getCollectionRef(householdId));
      const plannedIncomeId = plannedIncomeRef.id;

      const newPlannedIncome = {
        ...data,
        id: plannedIncomeId,
        createdAt: serverTimestamp(),
      };

      transaction.set(plannedIncomeRef, newPlannedIncome);

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
                incomeSource: data.category,
                createdBy: data.createdBy,
              },
              transaction, // Pass transaction to ensure atomicity
            );
          }
        }
      }

      return plannedIncomeId;
    });
  }

  // Get planned incomes
  async getPlannedIncomes(householdId: string): Promise<PlannedIncome[]> {
    return this.getAll(householdId, [orderBy('date', 'desc')]);
  }

  // Get latest planned income by category to retrieve user settings/defaults
  async getLatestPlannedIncomeByCategory(
    householdId: string,
    category: string,
  ): Promise<PlannedIncome | null> {
    const q = query(
      this.getCollectionRef(householdId),
      where('category', '==', category),
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc'), // Tie-breaker
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    return this.parseData(snapshot.docs[0].data());
  }

  // Update a planned income (Note: This does NOT update related project transactions)
  async updatePlannedIncome(
    householdId: string,
    plannedIncomeId: string,
    data: Partial<Omit<PlannedIncome, 'id' | 'createdAt'>>,
  ): Promise<void> {
    return this.update(householdId, plannedIncomeId, data);
  }

  // Delete a planned income (Note: This does NOT delete related project transactions)
  async deletePlannedIncome(householdId: string, plannedIncomeId: string): Promise<void> {
    return this.delete(householdId, plannedIncomeId);
  }
}

export const plannedIncomeService = new PlannedIncomeService();
