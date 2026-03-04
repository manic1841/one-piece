import { collection, doc } from 'firebase/firestore';

import { db } from '@/firebase';
import { BaseRepository } from '@/repositories/baseRepository';
import { type RetirementPlan, RetirementPlanSchema } from '@/schemas';

class RetirementPlanRepository extends BaseRepository<RetirementPlan, [string, string?]> {
  private readonly collectionName = 'retirementPlans';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, planId: string) {
    return doc(this.getCollectionRef(householdId), planId);
  }

  protected getDomainSchema() {
    return RetirementPlanSchema;
  }
}

export const retirementPlanRepository = new RetirementPlanRepository(db);
