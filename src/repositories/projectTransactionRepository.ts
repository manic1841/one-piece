import { collection, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ProjectTransactionSchema, type ProjectTransaction } from '../schemas';
import { convertToDate } from '@/utils/dateUtils';
import { BaseRepository } from './baseRepository';

type ProjectTransactionFirestore = Omit<ProjectTransaction, 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

class ProjectTransactionRepository extends BaseRepository<
  ProjectTransaction,
  ProjectTransactionFirestore,
  [string, string?]
> {
  private readonly collectionName = 'projectTransactions';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, transactionId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, transactionId);
  }

  protected toFirestore(entity: ProjectTransaction): ProjectTransactionFirestore {
    return {
      ...entity,
      createdAt: Timestamp.fromDate(entity.createdAt),
      updatedAt: Timestamp.fromDate(entity.updatedAt),
    };
  }

  protected fromFirestore(data: ProjectTransactionFirestore): ProjectTransaction {
    return ProjectTransactionSchema.parse({
      ...data,
      createdAt: convertToDate(data.createdAt),
      updatedAt: convertToDate(data.updatedAt),
    });
  }
}

export const projectTransactionRepository = new ProjectTransactionRepository(db);
