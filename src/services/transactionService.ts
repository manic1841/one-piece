import type {
  TransactionCategory,
  TransactionCreate,
  TransactionType,
} from '@/domains/record/types';
import { transactionRepository } from '@/repositories/transactionRepository';
import type { Transaction } from '@/schemas';
import { QueryConstraint, orderBy, where } from 'firebase/firestore';

class TransactionService {
  // Create a new transaction
  async createTransaction(
    householdId: string,
    transaction: TransactionCreate,
    userEmail: string,
  ): Promise<string> {
    return transactionRepository.create([householdId], transaction, userEmail);
  }

  // Get all transactions for a household with filters
  async getTransactions(
    householdId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      type?: TransactionType;
      category?: TransactionCategory;
    },
  ): Promise<Transaction[]> {
    const q: QueryConstraint[] = [orderBy('date', 'desc')];

    if (filters?.startDate) {
      q.push(where('date', '>=', filters.startDate));
    }
    if (filters?.endDate) {
      q.push(where('date', '<=', filters.endDate));
    }
    if (filters?.type) {
      q.push(where('type', '==', filters.type));
    }
    if (filters?.category) {
      q.push(where('category', '==', filters.category));
    }

    // Get all transactions sorted by date
    return await transactionRepository.list([householdId], q);
  }

  // Get a single transaction by ID
  async getTransaction(householdId: string, id: string): Promise<Transaction | null> {
    return transactionRepository.get([householdId, id]);
  }

  // Update a transaction
  async updateTransaction(
    householdId: string,
    id: string,
    updates: Partial<TransactionCreate>,
    userEmail: string,
  ): Promise<void> {
    return transactionRepository.update([householdId, id], updates, userEmail);
  }

  // Delete a transaction
  async deleteTransaction(householdId: string, id: string): Promise<void> {
    return transactionRepository.delete([householdId, id]);
  }
}

export const transactionService = new TransactionService();
