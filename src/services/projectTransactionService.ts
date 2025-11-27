import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  Transaction as FirestoreTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ProjectTransactionSchema, type ProjectTransaction } from '../schemas';

export const projectTransactionService = {
  // Create a new project transaction
  // Supports running within an existing Firestore transaction
  async createProjectTransaction(
    householdId: string,
    data: Omit<ProjectTransaction, 'id' | 'createdAt'>,
    transaction?: FirestoreTransaction,
  ): Promise<string> {
    const ref = doc(collection(db, 'households', householdId, 'projectTransactions'));
    const id = ref.id;

    // Convert date to Firestore Timestamp if it's a Date object
    const date = data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date;

    const newTransaction = {
      ...data,
      id,
      date,
      createdAt: serverTimestamp(),
    };

    if (transaction) {
      transaction.set(ref, newTransaction);
    } else {
      await import('firebase/firestore').then(({ setDoc }) => setDoc(ref, newTransaction));
    }

    return id;
  },

  // Get project transactions
  async getProjectTransactions(
    householdId: string,
    options?: {
      projectId?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ProjectTransaction[]> {
    let q = query(
      collection(db, 'households', householdId, 'projectTransactions'),
      orderBy('date', 'desc'),
    );

    if (options?.projectId) {
      // Note: This requires a composite index: projectId ASC, date DESC
      q = query(q, where('toProject', '==', options.projectId));
    }

    if (options?.startDate) {
      q = query(q, where('date', '>=', Timestamp.fromDate(new Date(options.startDate))));
    }

    if (options?.endDate) {
      q = query(q, where('date', '<=', Timestamp.fromDate(new Date(options.endDate))));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ProjectTransactionSchema.parse(doc.data()));
  },

  // Get project transactions by income source (plannedIncomeId)
  async getProjectTransactionsByIncomeSource(
    householdId: string,
    incomeSource: string,
  ): Promise<ProjectTransaction[]> {
    const q = query(
      collection(db, 'households', householdId, 'projectTransactions'),
      where('incomeSource', '==', incomeSource),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ProjectTransactionSchema.parse(doc.data()));
  },

  // Delete project transactions by IDs
  // Supports running within an existing Firestore transaction
  async deleteProjectTransactions(
    householdId: string,
    transactionIds: string[],
    transaction?: FirestoreTransaction,
  ): Promise<void> {
    if (transactionIds.length === 0) return;

    if (transaction) {
      // Use provided transaction
      for (const id of transactionIds) {
        const ref = doc(db, 'households', householdId, 'projectTransactions', id);
        transaction.delete(ref);
      }
    } else {
      // Use individual deletes
      const { deleteDoc } = await import('firebase/firestore');
      for (const id of transactionIds) {
        const ref = doc(db, 'households', householdId, 'projectTransactions', id);
        await deleteDoc(ref);
      }
    }
  },
};
