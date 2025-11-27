import { orderBy, Timestamp } from 'firebase/firestore';
import { TransactionSchema } from '../schemas';
import type { Transaction } from '../schemas';
import { toDateString } from '../utils/dateUtils';
import { BaseService } from './baseService';

class TransactionService extends BaseService<Transaction> {
  constructor() {
    super('transactions', TransactionSchema);
  }

  // Create a new transaction
  // Overriding to return string directly and match existing signature
  async createTransaction(
    householdId: string,
    transaction: Omit<Transaction, 'id' | 'createdAt'>,
  ): Promise<string> {
    return this.create(householdId, transaction);
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
    let transactions = await this.getAll(householdId, [orderBy('date', 'desc')]);

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
  }

  // Get a single transaction by ID
  async getTransaction(householdId: string, id: string): Promise<Transaction | null> {
    return this.getById(householdId, id);
  }

  // Update a transaction
  async updateTransaction(
    householdId: string,
    id: string,
    updates: Partial<Transaction>,
  ): Promise<void> {
    return this.update(householdId, id, updates);
  }

  // Delete a transaction
  async deleteTransaction(householdId: string, id: string): Promise<void> {
    return this.delete(householdId, id);
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
}

export const transactionService = new TransactionService();
