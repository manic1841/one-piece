import { collection, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { type Transaction, TransactionSchema } from '../schemas';
import { toDate } from '@/utils/dateUtils';
import { BaseRepository } from './baseRepository';

type TransactionFirestore = Omit<Transaction, 'date' | 'createdAt' | 'updatedAt'> & {
  date: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

class TransactionRepository extends BaseRepository<
  Transaction,
  TransactionFirestore,
  [string, string?]
> {
  private readonly collectionName = 'transactions';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, transactionId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, transactionId);
  }

  protected toFirestore(entity: Transaction): Partial<TransactionFirestore> {
    return {
      ...entity,
      date: entity.date ? Timestamp.fromDate(entity.date) : undefined,
      createdAt: entity.createdAt ? Timestamp.fromDate(entity.createdAt) : undefined,
      updatedAt: entity.updatedAt ? Timestamp.fromDate(entity.updatedAt) : undefined,
    };
  }

  protected fromFirestore(data: TransactionFirestore): Transaction {
    return TransactionSchema.parse({
      ...data,
      date: toDate(data.date),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    });
  }
}

export const transactionRepository = new TransactionRepository(db);
