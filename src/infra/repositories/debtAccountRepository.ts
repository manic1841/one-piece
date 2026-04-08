import {
  type Transaction as FirestoreTransaction,
  collection,
  doc,
  orderBy,
  where,
} from 'firebase/firestore';

import {
  type DebtAccount,
  type DebtAccountCreate,
  DebtAccountSchema,
} from '@/domains/debt/schemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export { type DebtAccount, type DebtAccountCreate };

/**
 * Repository for households/{householdId}/debtAccounts
 */
class DebtAccountRepository extends BaseRepository<DebtAccount, [string, string?]> {
  private readonly collectionName = 'debtAccounts';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, debtAccountId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, debtAccountId);
  }

  protected getDomainSchema() {
    return DebtAccountSchema;
  }

  /** Returns all active debt accounts ordered by type */
  async getDebtAccounts(householdId: string, includeInactive = false): Promise<DebtAccount[]> {
    if (includeInactive) {
      return this.list([householdId], [orderBy('type', 'asc')]);
    }
    return this.list([householdId], [where('isActive', '==', true), orderBy('type', 'asc')]);
  }

  /** Soft-delete: marks account as inactive */
  async deactivateDebtAccount(
    householdId: string,
    debtAccountId: string,
    userEmail: string,
  ): Promise<void> {
    await this.update([householdId, debtAccountId], { isActive: false }, userEmail);
  }

  /**
   * Checks whether a debt account has any associated LIABILITY_PAYMENT transactions.
   * Queries the transactions collection for entries referencing this debt account's
   * linkedLedgerCode (via the denormalized ledgerCodes index field).
   */
  async checkHasPayments(householdId: string, debtAccountId: string): Promise<boolean> {
    // Fetch the debt account to get its linkedLedgerCode
    const account = await this.get([householdId, debtAccountId]);
    if (!account) return false;

    const { linkedLedgerCode } = account;

    // Query transactions that reference this ledger code AND are LIABILITY_PAYMENT intent
    const transactions = await transactionRepository.list(
      [householdId],
      [
        where('intentType', '==', 'LIABILITY_PAYMENT'),
        where('ledgerCodes', 'array-contains', linkedLedgerCode),
      ],
    );

    return transactions.length > 0;
  }

  async createDebtAccount(
    householdId: string,
    data: DebtAccountCreate,
    userEmail: string,
    tx?: FirestoreTransaction,
  ): Promise<string> {
    return this.create([householdId], data, userEmail, tx);
  }

  async updateDebtAccount(
    householdId: string,
    debtAccountId: string,
    data: Partial<DebtAccountCreate>,
    userEmail: string,
  ): Promise<void> {
    await this.update([householdId, debtAccountId], data, userEmail);
  }

  async deleteDebtAccount(
    householdId: string,
    debtAccountId: string,
    tx?: FirestoreTransaction,
  ): Promise<void> {
    await this.delete([householdId, debtAccountId], tx);
  }
}

export const debtAccountRepository = new DebtAccountRepository(db);
