import { collection, doc } from 'firebase/firestore';

import { db } from '@/firebase';
import { BaseRepository } from '@/repositories/baseRepository';
import { type Transaction, TransactionSchema } from '@/schemas';

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
}

export const transactionRepository = new TransactionRepository(db);
