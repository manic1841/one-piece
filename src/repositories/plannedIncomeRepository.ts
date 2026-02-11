import { collection, doc } from 'firebase/firestore';

import { db } from '@/firebase';
import { BaseRepository } from '@/repositories/baseRepository';
import { type PlannedIncome, PlannedIncomeSchema } from '@/schemas';

class PlannedIncomeRepository extends BaseRepository<PlannedIncome, [string, string?]> {
  private readonly collectionName = 'plannedIncomes';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, plannedIncomeId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, plannedIncomeId);
  }
  protected getDomainSchema() {
    return PlannedIncomeSchema;
  }
}

export const plannedIncomeRepository = new PlannedIncomeRepository(db);
