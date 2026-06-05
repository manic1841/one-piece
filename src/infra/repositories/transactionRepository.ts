import {
  type Transaction as FirestoreTransaction,
  collection,
  doc,
  limit,
  orderBy,
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
  ): Promise<Transaction[]> {
    return this.list(
      [householdId],
      [where('date', '>=', startDate), where('date', '<', endDate), orderBy('date', 'desc')],
    );
  }

  async updateAllocationId(
    householdId: string,
    transactionId: string,
    allocationId: string,
    userEmail: string,
    tx?: FirestoreTransaction,
  ): Promise<void> {
    await this.update([householdId, transactionId], { allocationId }, userEmail, tx);
  }

  async getById(householdId: string, transactionId: string): Promise<Transaction | null> {
    return this.get([householdId, transactionId]);
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
  ): Promise<Transaction[]> {
    const buildDateRangeConstraints = () => {
      if (!yearMonth) return [];
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      return [where('date', '>=', startDate), where('date', '<', endDate), orderBy('date', 'desc')];
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

  async listByProject(householdId: string, projectId: string): Promise<Transaction[]> {
    return this.list([householdId], [where('projectId', '==', projectId), orderBy('date', 'desc')]);
  }
}

export const transactionRepository = new TransactionRepository(db);
