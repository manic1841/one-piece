import {
  type Transaction as FirestoreTransaction,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
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
   * Two-tier debt history detection for smart delete.
   * Canonical tier: DEBT_PAYMENT transactions scoped to this debtAccountId.
   * Legacy tier: raw LIABILITY_PAYMENT documents on the linked ledger code,
   * read without the domain schema because LIABILITY_PAYMENT was removed from
   * IntentType; history documents must still block deletion.
   */
  async checkHasPayments(householdId: string, debtAccountId: string): Promise<boolean> {
    const account = await this.get([householdId, debtAccountId]);
    if (!account) return false;

    const hasCanonicalPayments = await transactionRepository.hasDebtPaymentForAccount(
      householdId,
      debtAccountId,
    );
    if (hasCanonicalPayments) return true;

    const legacyQuery = query(
      collection(this.db, 'households', householdId, 'transactions'),
      where('intentType', '==', 'LIABILITY_PAYMENT'),
      where('ledgerCodes', 'array-contains', account.linkedLedgerCode),
      limit(1),
    );
    const legacySnapshot = await getDocs(legacyQuery);
    return !legacySnapshot.empty;
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
    tx?: FirestoreTransaction,
  ): Promise<void> {
    await this.update([householdId, debtAccountId], data, userEmail, tx);
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
