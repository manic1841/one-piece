import {
  type Transaction as FirestoreTransaction,
  collection,
  doc,
  limit,
  orderBy,
  where,
} from 'firebase/firestore';

import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';
import {
  type Transaction,
  type TransactionCreate,
  TransactionSchema,
} from '@/infra/schemas/ledger';

class TransactionRepository extends BaseRepository<Transaction, [string, string?]> {
  private readonly collectionName = 'transactions';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, transactionId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, transactionId);
  }

  protected getDomainSchema() {
    return TransactionSchema;
  }

  // Override create to auto-extract ledgerCodes and accountIds
  async create(
    args: [string, string?],
    data: TransactionCreate,
    userEmail: string,
    tx?: FirestoreTransaction,
    customId?: string,
  ): Promise<string> {
    const ledgerCodes = Array.from(new Set(data.entries.map((e) => e.ledgerCode)));
    return super.create(args, { ...data, ledgerCodes }, userEmail, tx, customId);
  }

  async getTransactionsByProject(
    householdId: string,
    projectId: string,
    yearMonth: string,
  ): Promise<Transaction[]> {
    // yearMonth format: 'YYYY-MM'
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    return this.list(
      [householdId],
      [
        where('projectId', '==', projectId),
        where('date', '>=', startDate),
        where('date', '<', endDate),
        orderBy('date', 'desc'),
      ],
    );
  }

  async getRecentTransactions(householdId: string, maxLimit: number): Promise<Transaction[]> {
    return this.list([householdId], [orderBy('date', 'desc'), limit(maxLimit)]);
  }

  async updateAllocationId(
    householdId: string,
    transactionId: string,
    allocationId: string,
    userEmail: string,
  ): Promise<void> {
    await this.update([householdId, transactionId], { allocationId }, userEmail);
  }
  async getProjectTransfers(householdId: string, yearMonth: string): Promise<Transaction[]> {
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    return this.list(
      [householdId],
      [
        where('intentType', '==', 'PROJECT_TRANSFER'),
        where('date', '>=', startDate),
        where('date', '<', endDate),
        orderBy('date', 'desc'),
      ],
    );
  }

  async listByProject(householdId: string, projectId: string): Promise<Transaction[]> {
    return this.list([householdId], [where('projectId', '==', projectId), orderBy('date', 'desc')]);
  }
}

export const transactionRepository = new TransactionRepository(db);
