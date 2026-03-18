import { collection, doc } from 'firebase/firestore';

import { type Household, HouseholdSchema } from '@/domains/household/schemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';

class HouseholdRepository extends BaseRepository<Household, [string?]> {
  private readonly collectionName = 'households';

  protected getCollectionRef() {
    return collection(this.db, this.collectionName);
  }

  protected getDocRef(householdId: string) {
    return doc(this.db, this.collectionName, householdId);
  }

  protected getDomainSchema() {
    return HouseholdSchema;
  }
}

export const householdRepository = new HouseholdRepository(db);
