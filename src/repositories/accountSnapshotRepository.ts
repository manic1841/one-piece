import { db } from '@/firebase';
import { BaseRepository } from '@/repositories/baseRepository';
import { type AccountSnapshot, AccountSnapshotSchema } from '@/schemas';
import { collection, doc } from 'firebase/firestore';

class AccountSnapshotRepository extends BaseRepository<AccountSnapshot, [string, string, string?]> {
  protected getCollectionRef(householdId: string, accountId: string) {
    return collection(this.db, 'households', householdId, 'accounts', accountId, 'snapshots');
  }

  protected getDocRef(householdId: string, accountId: string, snapshotId: string) {
    return doc(this.getCollectionRef(householdId, accountId), snapshotId);
  }
  protected getDomainSchema() {
    return AccountSnapshotSchema;
  }
}

export const accountSnapshotRepository = new AccountSnapshotRepository(db);
