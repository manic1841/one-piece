import { collection, doc } from 'firebase/firestore';

import { db } from '../firebase';
import { type ProjectTransaction, ProjectTransactionSchema } from '../schemas';
import { BaseRepository } from './baseRepository';

class ProjectTransactionRepository extends BaseRepository<ProjectTransaction, [string, string?]> {
  private readonly collectionName = 'projectTransactions';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, transactionId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, transactionId);
  }
  protected getDomainSchema() {
    return ProjectTransactionSchema;
  }
}

export const projectTransactionRepository = new ProjectTransactionRepository(db);
