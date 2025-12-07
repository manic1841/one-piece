import { db } from '@/firebase';
import { BaseRepository } from '@/repositories/baseRepository';
import { type Account, AccountSchema } from '@/schemas';
import { collection, doc } from 'firebase/firestore';

class AccountRepository extends BaseRepository<Account, [string, string?]> {
  private readonly collectionName = 'accounts';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, accountId: string) {
    return doc(this.getCollectionRef(householdId), accountId);
  }
  protected getDomainSchema() {
    return AccountSchema;
  }
}

export const accountRepository = new AccountRepository(db);
