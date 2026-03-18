import { collection, doc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';
import { type AccountSnapshot, AccountSnapshotSchema } from '@/domains/account/types/account';

/**
 * AccountSnapshotRepository
 * Path: households/{householdId}/accounts/{accountId}/snapshots
 */
class AccountSnapshotRepository extends BaseRepository<AccountSnapshot, [string, string, string?]> {
  private readonly collectionName = 'snapshots';

  protected getCollectionRef(householdId: string, accountId: string) {
    return collection(this.db, 'households', householdId, 'accounts', accountId, this.collectionName);
  }

  protected getDocRef(householdId: string, accountId: string, snapshotId: string) {
    return doc(
      this.db,
      'households',
      householdId,
      'accounts',
      accountId,
      this.collectionName,
      snapshotId
    );
  }

  protected getDomainSchema() {
    return AccountSnapshotSchema;
  }

  buildId(year: number, month: number): string {
    return `${year}-${month.toString().padStart(2, '0')}`;
  }

  async getSnapshot(householdId: string, accountId: string, yearMonth: string): Promise<AccountSnapshot | null> {
    return this.get([householdId, accountId, yearMonth]);
  }

  async getLatestSnapshot(householdId: string, accountId: string, beforeYearMonth?: string): Promise<AccountSnapshot | null> {
    const constraints = [
      orderBy('year', 'desc'),
      orderBy('month', 'desc'),
      limit(1)
    ];

    if (beforeYearMonth) {
      // Future implementation: filter based on yearMonth string if index exists
    }

    const q = query(this.getCollectionRef(householdId, accountId), ...constraints);
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const data = this.convertFromFirestore(snap.docs[0].data());
    return this.getDomainSchema().parse(data) as AccountSnapshot;
  }
}

export const accountSnapshotRepository = new AccountSnapshotRepository(db);
