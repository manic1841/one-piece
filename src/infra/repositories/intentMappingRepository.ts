import { collection, doc } from 'firebase/firestore';

import { type IntentMapping, IntentMappingSchema } from '@/domains/ledger/schemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';

class IntentMappingRepository extends BaseRepository<IntentMapping, [string, string?]> {
  private readonly collectionName = 'intent_mappings';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, mappingId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, mappingId);
  }

  protected getDomainSchema() {
    return IntentMappingSchema;
  }
}

export const intentMappingRepository = new IntentMappingRepository(db);
