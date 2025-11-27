import {
  collection,
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

export const plannedIncomeService = {
  // Create a new planned income and generate project transactions
  async createPlannedIncome(
    householdId: string,
    data: Omit<PlannedIncome, 'id' | 'createdAt'>,
  ): Promise<string> {
    return await runTransaction(db, async (transaction) => {
      // 1. Create PlannedIncome document
      const plannedIncomeRef = doc(collection(db, 'households', householdId, 'plannedIncome'));
      const plannedIncomeId = plannedIncomeRef.id;

      const newPlannedIncome = {
        ...data,
        id: plannedIncomeId,
        createdAt: serverTimestamp(),
      };

      transaction.set(plannedIncomeRef, newPlannedIncome);

      // 2. Create ProjectTransactions for each allocation
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

      return plannedIncomeId;
    });
  },

  // Get planned incomes
  async getPlannedIncomes(householdId: string): Promise<PlannedIncome[]> {
    const q = query(
      collection(db, 'households', householdId, 'plannedIncome'),
      orderBy('date', 'desc'),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => PlannedIncomeSchema.parse(doc.data()));
  },

  // Get latest planned income by category to retrieve user settings/defaults
  async getLatestPlannedIncomeByCategory(
    householdId: string,
    category: string,
  ): Promise<PlannedIncome | null> {
    const q = query(
      collection(db, 'households', householdId, 'plannedIncome'),
      where('category', '==', category),
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc'), // Tie-breaker
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    return PlannedIncomeSchema.parse(snapshot.docs[0].data());
  },

  // Update a planned income (Note: This does NOT update related project transactions)
  async updatePlannedIncome(
    householdId: string,
    plannedIncomeId: string,
    data: Partial<Omit<PlannedIncome, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const { updateDoc } = await import('firebase/firestore');
    const plannedIncomeRef = doc(db, 'households', householdId, 'plannedIncome', plannedIncomeId);

    await updateDoc(plannedIncomeRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete a planned income (Note: This does NOT delete related project transactions)
  async deletePlannedIncome(householdId: string, plannedIncomeId: string): Promise<void> {
    const { deleteDoc } = await import('firebase/firestore');
    const plannedIncomeRef = doc(db, 'households', householdId, 'plannedIncome', plannedIncomeId);
    await deleteDoc(plannedIncomeRef);
  },
};
