import { collection, doc, Timestamp, type DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';
import { PlannedIncomeSchema, type PlannedIncome } from '@/schemas';
import { toDate } from '@/utils/dateUtils';
import { BaseRepository } from '@/repositories/baseRepository';

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
  private readonly collectionName = 'plannedIncomes';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, plannedIncomeId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, plannedIncomeId);
  }

  protected toFirestore(entity: PlannedIncome): Partial<PlannedIncomeFirestore> {
    return {
      ...entity,
      date: entity.date ? Timestamp.fromDate(entity.date) : undefined,
      createdAt: entity.createdAt ? Timestamp.fromDate(entity.createdAt) : undefined,
      updatedAt: entity.updatedAt ? Timestamp.fromDate(entity.updatedAt) : undefined,
    };
  }

  protected fromFirestore(data: DocumentData): PlannedIncome {
    return PlannedIncomeSchema.parse({
      ...data,
      date: toDate(data.date),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    });
  }
}

export const plannedIncomeRepository = new PlannedIncomeRepository(db);
