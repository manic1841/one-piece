import { collection, doc } from 'firebase/firestore';

import { db } from '../firebase';
import { type Household, HouseholdSchema } from '../schemas';

import { BaseRepository } from './baseRepository';

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
