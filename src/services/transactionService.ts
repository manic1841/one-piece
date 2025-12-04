import { orderBy } from 'firebase/firestore';
import type { Transaction } from '../schemas';
import { toDateString } from '../utils/dateUtils';
import { transactionRepository } from '../repositories/transactionRepository';

class TransactionService {
  // Create a new transaction
  async createTransaction(
    householdId: string,
    transaction: Omit<Transaction, 'id' | 'createdAt'>,
    userEmail: string,
  ): Promise<string> {
    return transactionRepository.create([householdId], transaction, userEmail);
  }

  // Get all transactions for a household with filters
  async getTransactions(
    householdId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      type?: 'income' | 'expense';
      category?: string;
    },
  ): Promise<Transaction[]> {
    // Get all transactions sorted by date
    let transactions = await transactionRepository.list([householdId], [orderBy('date', 'desc')]);

    // Apply client-side filters
    if (filters) {
      if (filters.startDate) {
        transactions = transactions.filter((t) => {
          const date = t.date;
          const dateStr = toDateString(date);
          return dateStr >= filters.startDate!;
        });
      }
      if (filters.endDate) {
        transactions = transactions.filter((t) => {
          const date = t.date;
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
  }

  // Get a single transaction by ID
  async getTransaction(householdId: string, id: string): Promise<Transaction | null> {
    return transactionRepository.get([householdId, id]);
  }

  // Update a transaction
  async updateTransaction(
    householdId: string,
    id: string,
    updates: Partial<Transaction>,
    userEmail: string,
  ): Promise<void> {
    return transactionRepository.update([householdId, id], updates, userEmail);
  }

  // Delete a transaction
  async deleteTransaction(householdId: string, id: string): Promise<void> {
    return transactionRepository.delete([householdId, id]);
  }

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
  }

  // Get transactions by period (using Date objects)
  async getTransactionsByPeriod(
    householdId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]> {
    const start = toDateString(startDate);
    const end = toDateString(endDate);
    return this.getTransactions(householdId, { startDate: start, endDate: end });
  }
}

export const transactionService = new TransactionService();
