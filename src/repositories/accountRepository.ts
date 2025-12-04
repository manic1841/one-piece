import { collection, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AccountSchema, type Account } from '../schemas';
import { convertToDate } from '@/utils/dateUtils';
import { BaseRepository } from './baseRepository';

type AccountFirestore = Omit<Account, 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

class AccountRepository extends BaseRepository<Account, AccountFirestore, [string, string?]> {
  private readonly collectionName = 'accounts';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, accountId: string) {
    return doc(this.getCollectionRef(householdId), accountId);
  }

  protected toFirestore(entity: Account): AccountFirestore {
    return {
      ...entity,
      createdAt: Timestamp.fromDate(entity.createdAt),
      updatedAt: Timestamp.fromDate(entity.updatedAt),
    };
  }

  protected fromFirestore(data: AccountFirestore): Account {
    return AccountSchema.parse({
      ...data,
      createdAt: convertToDate(data.createdAt),
      updatedAt: convertToDate(data.updatedAt),
    });
  }
}

export const accountRepository = new AccountRepository(db);
