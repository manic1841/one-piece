import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { TransactionSchema, parseWithSchema } from '../schemas';
import type { Transaction } from '../schemas';
import { toDateString } from '../utils/dateUtils';

export const transactionService = {
  // Create a new transaction
  async createTransaction(
    householdId: string,
    transaction: Omit<Transaction, 'id' | 'createdAt'>,
  ): Promise<string> {
    const transactionRef = doc(collection(db, 'households', householdId, 'transactions'));
    const transactionId = transactionRef.id;

    // Convert date to Firestore Timestamp if it's a Date object
    const date =
      transaction.date instanceof Date ? Timestamp.fromDate(transaction.date) : transaction.date;

    const newTransaction = {
      ...transaction,
      date,
      id: transactionId,
      createdAt: serverTimestamp(),
    };

    await setDoc(transactionRef, newTransaction);
    return transactionId;
  },

  // Get all transactions for a household
  async getTransactions(
    householdId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      type?: 'income' | 'expense';
      category?: string;
    },
  ): Promise<Transaction[]> {
    const transactionsRef = collection(db, 'households', householdId, 'transactions');
    const q = query(transactionsRef, orderBy('date', 'desc'));

    const querySnapshot = await getDocs(q);
    let transactions = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      // Ensure date is handled correctly before validation if needed,
      // but Zod schema handles Timestamp | Date.
      // Firestore returns Timestamp, so it should be fine.
      return parseWithSchema(TransactionSchema, data);
    });

    // Apply client-side filters
    if (filters) {
      if (filters.startDate) {
        transactions = transactions.filter((t) => {
          const date = t.date instanceof Timestamp ? t.date.toDate() : t.date;
          const dateStr = toDateString(date);
          return dateStr >= filters.startDate!;
        });
      }
      if (filters.endDate) {
        transactions = transactions.filter((t) => {
          const date = t.date instanceof Timestamp ? t.date.toDate() : t.date;
          const dateStr = toDateString(date);
          return dateStr <= filters.endDate!;
        });
      }
      if (filters.type) {
        transactions = transactions.filter((t) => t.type === filters.type);
      }
      if (filters.category) {
        transactions = transactions.filter((t) => t.category === filters.category);
      }
    }

    return transactions;
  },

  // Get a single transaction by ID
  async getTransaction(householdId: string, id: string): Promise<Transaction | null> {
    const docRef = doc(db, 'households', householdId, 'transactions', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return parseWithSchema(TransactionSchema, docSnap.data());
    }
    return null;
  },

  // Update a transaction
  async updateTransaction(
    householdId: string,
    id: string,
    updates: Partial<Transaction>,
  ): Promise<void> {
    const transactionRef = doc(db, 'households', householdId, 'transactions', id);

    // Convert date to Timestamp if it's a Date object
    const processedUpdates = { ...updates };
    if (processedUpdates.date && processedUpdates.date instanceof Date) {
      processedUpdates.date = Timestamp.fromDate(processedUpdates.date);
    }

    await updateDoc(transactionRef, processedUpdates);
  },

  // Delete a transaction
  async deleteTransaction(householdId: string, id: string): Promise<void> {
    const transactionRef = doc(db, 'households', householdId, 'transactions', id);
    await deleteDoc(transactionRef);
  },

  // Get transaction statistics (summary)
  async getTransactionStats(
    householdId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    totalIncome: number;
    totalExpense: number;
    balance: number;
  }> {
    const transactions = await this.getTransactions(householdId, { startDate, endDate });

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  },
};
