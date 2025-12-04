import { collection, doc, Timestamp, type DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import { PlannedIncomeSchema, type PlannedIncome } from '../schemas';
import { convertToDate } from '@/utils/dateUtils';
import { BaseRepository } from './baseRepository';

type PlannedIncomeFirestore = Omit<PlannedIncome, 'date' | 'createdAt' | 'updatedAt'> & {
  date: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

class PlannedIncomeRepository extends BaseRepository<
  PlannedIncome,
  PlannedIncomeFirestore,
  [string, string?]
> {
  private readonly collectionName = 'plannedIncome';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, plannedIncomeId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, plannedIncomeId);
  }

  protected toFirestore(entity: PlannedIncome): PlannedIncomeFirestore {
    return {
      ...entity,
      date: Timestamp.fromDate(entity.date),
      createdAt: Timestamp.fromDate(entity.createdAt),
      updatedAt: Timestamp.fromDate(entity.updatedAt),
    };
  }

  protected fromFirestore(data: DocumentData): PlannedIncome {
    return PlannedIncomeSchema.parse({
      ...data,
      date: convertToDate(data.date),
      createdAt: convertToDate(data.createdAt),
      updatedAt: convertToDate(data.updatedAt),
    });
  }
}

export const plannedIncomeRepository = new PlannedIncomeRepository(db);
