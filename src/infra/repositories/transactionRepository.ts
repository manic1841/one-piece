import {
  type QueryConstraint,
  type Transaction as FirestoreTransaction,
  collection,
  doc,
  documentId,
  limit,
  orderBy,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { type DebtAccount } from '@/domains/debt/schemas';
import { IntentType } from '@/domains/ledger/constants/intentType';
import {
  type Transaction,
  type TransactionCreate,
  TransactionSchema,
} from '@/domains/ledger/schemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';

const toMillis = (value: unknown): number => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    value &&
    typeof value === 'object' &&
    'seconds' in value &&
    typeof (value as { seconds?: unknown }).seconds === 'number'
  ) {
    return ((value as { seconds: number }).seconds || 0) * 1000;
  }

  return 0;
};

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

  generateId(householdId: string): string {
    return doc(this.getCollectionRef(householdId)).id;
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

  async updateTransactionData(
    householdId: string,
    transactionId: string,
    data: Partial<TransactionCreate>,
    userEmail: string,
    tx?: FirestoreTransaction,
  ): Promise<void> {
    const ledgerCodes = data.entries
      ? Array.from(new Set(data.entries.map((entry) => entry.ledgerCode)))
      : undefined;

    await this.update(
      [householdId, transactionId],
      {
        ...data,
        ...(ledgerCodes ? { ledgerCodes } : {}),
      },
      userEmail,
      tx,
    );
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

  async listByDateRange(
    householdId: string,
    startDate: Date,
    endDate: Date,
    maxLimit?: number,
  ): Promise<Transaction[]> {
    const constraints: QueryConstraint[] = [
      where('date', '>=', startDate),
      where('date', '<', endDate),
      orderBy('date', 'desc'),
    ];
    if (maxLimit !== undefined) {
      constraints.push(limit(maxLimit));
    }
    return this.list([householdId], constraints);
  }

  async updateAllocationId(
    householdId: string,
    transactionId: string,
    allocationId: string,
    userEmail: string,
    tx?: FirestoreTransaction,
  ): Promise<void> {
    const docRef = this.getDocRef(householdId, transactionId);
    const payload = {
      allocationId,
      updatedBy: userEmail,
      updatedAt: serverTimestamp(),
    };

    if (tx) {
      tx.update(docRef, payload);
    } else {
      await updateDoc(docRef, payload);
    }
  }

  async getById(householdId: string, transactionId: string): Promise<Transaction | null> {
    return this.get([householdId, transactionId]);
  }

  /**
   * Batched document-ID read. Firestore `in` supports max 30 values per query,
   * so IDs are chunked accordingly. Returns all found transactions in any order.
   */
  async getByIds(householdId: string, transactionIds: string[]): Promise<Transaction[]> {
    if (transactionIds.length === 0) return [];

    const FIRESTORE_IN_LIMIT = 30;
    const results: Transaction[] = [];

    for (let i = 0; i < transactionIds.length; i += FIRESTORE_IN_LIMIT) {
      const chunk = transactionIds.slice(i, i + FIRESTORE_IN_LIMIT);
      const found = await this.list([householdId], [where(documentId(), 'in', chunk)]);
      results.push(...found);
    }

    return results;
  }

  async getProjectTransfers(householdId: string, yearMonth: string): Promise<Transaction[]> {
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    return this.list(
      [householdId],
      [
        where('intentType', '==', IntentType.TRANSFER),
        where('date', '>=', startDate),
        where('date', '<', endDate),
        orderBy('date', 'desc'),
      ],
    );
  }

  async listTransfersByProject(
    householdId: string,
    projectId: string,
    yearMonth?: string,
    sinceDate?: Date,
  ): Promise<Transaction[]> {
    const buildDateRangeConstraints = () => {
      const constraints: QueryConstraint[] = [];
      if (sinceDate) {
        constraints.push(where('date', '>=', sinceDate));
      }
      if (yearMonth) {
        const [year, month] = yearMonth.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);
        constraints.push(where('date', '>=', startDate), where('date', '<', endDate));
      }
      if (constraints.length > 0) {
        constraints.push(orderBy('date', 'desc'));
      }
      return constraints;
    };

    // Firestore doesn't support OR queries; run two queries and merge
    const dateRangeConstraints = buildDateRangeConstraints();

    const fromTransfers = await this.list(
      [householdId],
      [
        where('intentType', '==', IntentType.TRANSFER),
        where('fromProjectId', '==', projectId),
        ...dateRangeConstraints,
      ],
    );

    const toTransfers = await this.list(
      [householdId],
      [
        where('intentType', '==', IntentType.TRANSFER),
        where('toProjectId', '==', projectId),
        ...dateRangeConstraints,
      ],
    );

    const combined = [...fromTransfers, ...toTransfers];
    const seen = new Map<string, Transaction>();
    for (const t of combined) {
      seen.set(t.id, t);
    }

    return Array.from(seen.values()).sort((a, b) => toMillis(b.date) - toMillis(a.date));
  }

  async listByDebtAccount(householdId: string, debtAccountId: string): Promise<Transaction[]> {
    return this.list(
      [householdId],
      [
        where('debtAccountId', '==', debtAccountId),
        where('intentType', '==', IntentType.DEBT_PAYMENT),
        orderBy('date', 'desc'),
      ],
    );
  }

  async listDebtPaymentsByDateRange(
    householdId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]> {
    return this.list(
      [householdId],
      [
        where('intentType', '==', IntentType.DEBT_PAYMENT),
        where('date', '>=', startDate),
        where('date', '<', endDate),
        orderBy('date', 'desc'),
      ],
    );
  }

  async listByDebtAccountAndIntent(
    householdId: string,
    debtAccountId: string,
    intentType: Transaction['intentType'],
  ): Promise<Transaction[]> {
    return this.list(
      [householdId],
      [
        where('debtAccountId', '==', debtAccountId),
        where('intentType', '==', intentType),
        orderBy('date', 'desc'),
      ],
    );
  }

  async hasDebtPaymentForAccount(householdId: string, debtAccountId: string): Promise<boolean> {
    const transactions = await this.list(
      [householdId],
      [
        where('debtAccountId', '==', debtAccountId),
        where('intentType', '==', IntentType.DEBT_PAYMENT),
        limit(1),
      ],
    );
    return transactions.length > 0;
  }

  async findBorrowTransactionsForDebtAccount(
    householdId: string,
    debtAccount: DebtAccount,
  ): Promise<Transaction[]> {
    const exactMatches = await this.listByDebtAccountAndIntent(
      householdId,
      debtAccount.id,
      IntentType.LIABILITY_BORROW,
    );
    if (exactMatches.length > 0) return exactMatches;

    const legacyCandidates = await this.list(
      [householdId],
      [
        where('intentType', '==', IntentType.LIABILITY_BORROW),
        where('ledgerCodes', 'array-contains', debtAccount.linkedLedgerCode),
      ],
    );

    const startAt = debtAccount.startDate.getTime();

    return legacyCandidates.filter((transaction) => {
      if (transaction.debtAccountId) return false;
      if (transaction.projectId !== null && transaction.projectId !== undefined) return false;
      if ((transaction.amount ?? 0) !== debtAccount.originalAmount) return false;
      if (toMillis(transaction.date) !== startAt) return false;

      return transaction.entries.some(
        (entry) =>
          entry.ledgerCode === debtAccount.linkedLedgerCode &&
          entry.credit === debtAccount.originalAmount,
      );
    });
  }

  async listByProject(
    householdId: string,
    projectId: string,
    sinceDate?: Date,
  ): Promise<Transaction[]> {
    const constraints: QueryConstraint[] = [where('projectId', '==', projectId)];
    if (sinceDate) {
      constraints.push(where('date', '>=', sinceDate));
    }
    constraints.push(orderBy('date', 'desc'));
    return this.list([householdId], constraints);
  }
}

export const transactionRepository = new TransactionRepository(db);
