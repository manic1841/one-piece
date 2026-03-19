import { collection, doc } from 'firebase/firestore';

import {
  type CustomLedgerCode,
  type CustomLedgerCodeCreate,
  CustomLedgerCodeSchema,
} from '@/domains/ledger/schemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';

export { type CustomLedgerCode, type CustomLedgerCodeCreate };

/**
 * Repository for households/{householdId}/ledgerCodes
 * Manages custom (user/system-defined) ledger codes.
 * The document ID equals the code string itself (e.g. "liability:mortgage").
 */
class CustomLedgerCodeRepository extends BaseRepository<CustomLedgerCode, [string, string?]> {
  private readonly collectionName = 'ledgerCodes';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, code: string) {
    return doc(this.db, 'households', householdId, this.collectionName, code);
  }

  protected getDomainSchema() {
    return CustomLedgerCodeSchema;
  }

  /** Returns null if the ledger code does not exist. */
  async findByCode(householdId: string, code: string): Promise<CustomLedgerCode | null> {
    return this.get([householdId, code]);
  }

  /**
   * Creates a custom ledger code using the code string as the document ID.
   * The `data.code` value is used as the Firestore document ID.
   */
  async createCustomCode(
    householdId: string,
    data: CustomLedgerCodeCreate,
    userEmail: string,
  ): Promise<void> {
    // Pass code as customId so the doc ID matches the code string
    await this.create([householdId], data, userEmail, undefined, data.code);
  }
}

export const customLedgerCodeRepository = new CustomLedgerCodeRepository(db);
