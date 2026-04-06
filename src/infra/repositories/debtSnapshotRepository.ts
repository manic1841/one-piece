import { collection, doc, orderBy, where } from 'firebase/firestore';

import {
  type DebtSnapshot,
  type DebtSnapshotCreate,
  DebtSnapshotSchema,
} from '@/domains/debt/schemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';

export { type DebtSnapshot, type DebtSnapshotCreate };

/**
 * Repository for:
 *   households/{householdId}/debtAccounts/{debtAccountId}/snapshots/{yearMonth}
 *
 * Document ID is the yearMonth string (e.g. "2026-03").
 */
class DebtSnapshotRepository extends BaseRepository<DebtSnapshot, [string, string, string?]> {
  protected getCollectionRef(householdId: string, debtAccountId: string) {
    return collection(
      this.db,
      'households',
      householdId,
      'debtAccounts',
      debtAccountId,
      'snapshots',
    );
  }

  protected getDocRef(householdId: string, debtAccountId: string, yearMonth: string) {
    return doc(
      this.db,
      'households',
      householdId,
      'debtAccounts',
      debtAccountId,
      'snapshots',
      yearMonth,
    );
  }

  protected getDomainSchema() {
    return DebtSnapshotSchema;
  }

  async getSnapshot(
    householdId: string,
    debtAccountId: string,
    yearMonth: string,
  ): Promise<DebtSnapshot | null> {
    return this.get([householdId, debtAccountId, yearMonth]);
  }

  async listByYearMonthRange(
    householdId: string,
    debtAccountId: string,
    startYearMonth: string,
    endYearMonth: string,
  ): Promise<DebtSnapshot[]> {
    return this.list(
      [householdId, debtAccountId],
      [
        where('yearMonth', '>=', startYearMonth),
        where('yearMonth', '<=', endYearMonth),
        orderBy('yearMonth', 'desc'),
      ],
    );
  }

  /**
   * Idempotent upsert:
   * - If a snapshot for the yearMonth already exists → cumulate principalPaid,
   *   interestPaid, totalPaid and recalculate closingBalance.
   * - Otherwise → create a new snapshot.
   */
  async upsertSnapshot(
    householdId: string,
    debtAccountId: string,
    data: DebtSnapshotCreate,
    userEmail: string,
  ): Promise<void> {
    const existing = await this.getSnapshot(householdId, debtAccountId, data.yearMonth);

    if (existing) {
      const principalPaid = existing.principalPaid + data.principalPaid;
      const interestPaid = existing.interestPaid + data.interestPaid;
      const totalPaid = existing.totalPaid + data.totalPaid;
      const closingBalance = existing.openingBalance - principalPaid;

      await this.update(
        [householdId, debtAccountId, data.yearMonth],
        { principalPaid, interestPaid, totalPaid, closingBalance },
        userEmail,
      );
    } else {
      await this.create(
        [householdId, debtAccountId],
        data,
        userEmail,
        undefined,
        data.yearMonth, // use yearMonth as document ID
      );
    }
  }
}

export const debtSnapshotRepository = new DebtSnapshotRepository(db);
