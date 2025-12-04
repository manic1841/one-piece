import { Timestamp, collection, doc } from 'firebase/firestore';
import { AccountSnapshotSchema, type AccountSnapshot } from '@/schemas';
import { BaseRepository } from './baseRepository';
import { convertToDate } from '@/utils/dateUtils';
import { db } from '@/firebase';

type AccountSnapshotFirestore = Omit<AccountSnapshot, 'id' | 'createdAt'> & {
  createdAt: Timestamp;
};

class AccountSnapshotRepository extends BaseRepository<
  AccountSnapshot,
  AccountSnapshotFirestore,
  [string, string, string?]
> {
  protected getCollectionRef(householdId: string, accountId: string) {
    return collection(this.db, 'households', householdId, 'accounts', accountId, 'snapshots');
  }

  protected getDocRef(householdId: string, accountId: string, snapshotId: string) {
    return doc(this.getCollectionRef(householdId, accountId), snapshotId);
  }

  protected toFirestore(entity: AccountSnapshot): AccountSnapshotFirestore {
    return {
      ...entity,
      createdAt: Timestamp.fromDate(entity.createdAt),
    };
  }

  protected fromFirestore(data: AccountSnapshotFirestore): AccountSnapshot {
    return AccountSnapshotSchema.parse({
      ...data,
      createdAt: convertToDate(data.createdAt),
    });
  }
}

export const accountSnapshotRepository = new AccountSnapshotRepository(db);
