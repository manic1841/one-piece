import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { type Transaction } from '../types';

export const transactionService = {
    // Create a new transaction
    async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
        const transactionRef = doc(collection(db, 'transactions'));
        const transactionId = transactionRef.id;

        // Convert date to Firestore Timestamp if it's a Date object
        const date = transaction.date instanceof Date
            ? Timestamp.fromDate(transaction.date)
            : transaction.date;

        const newTransaction = {
            ...transaction,
            date,
            id: transactionId,
            createdAt: serverTimestamp()
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
        }
    ): Promise<Transaction[]> {
        let q = query(
            collection(db, 'transactions'),
            where('householdId', '==', householdId),
            orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(q);
        let transactions = querySnapshot.docs.map(doc => doc.data() as Transaction);

        // Apply client-side filters
        if (filters) {
            if (filters.startDate) {
                transactions = transactions.filter(t => {
                    const dateStr = t.date.toDate ? t.date.toDate().toISOString().split('T')[0] : t.date;
                    return dateStr >= filters.startDate!;
                });
            }
            if (filters.endDate) {
                transactions = transactions.filter(t => {
                    const dateStr = t.date.toDate ? t.date.toDate().toISOString().split('T')[0] : t.date;
                    return dateStr <= filters.endDate!;
                });
            }
            if (filters.type) {
                transactions = transactions.filter(t => t.type === filters.type);
            }
            if (filters.category) {
                transactions = transactions.filter(t => t.category === filters.category);
            }
        }

        return transactions;
    },

    // Get a single transaction by ID
    async getTransaction(id: string): Promise<Transaction | null> {
        const docRef = doc(db, 'transactions', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as Transaction;
        }
        return null;
    },

    // Update a transaction
    async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
        const transactionRef = doc(db, 'transactions', id);

        // Convert date to Timestamp if it's a Date object  
        const processedUpdates = { ...updates };
        if (processedUpdates.date && processedUpdates.date instanceof Date) {
            processedUpdates.date = Timestamp.fromDate(processedUpdates.date) as any;
        }

        await updateDoc(transactionRef, processedUpdates);
    },

    // Delete a transaction
    async deleteTransaction(id: string): Promise<void> {
        const transactionRef = doc(db, 'transactions', id);
        await deleteDoc(transactionRef);
    },

    // Get transaction statistics (summary)
    async getTransactionStats(householdId: string, startDate?: string, endDate?: string): Promise<{
        totalIncome: number;
        totalExpense: number;
        balance: number;
    }> {
        const transactions = await this.getTransactions(householdId, { startDate, endDate });

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense
        };
    }
};
