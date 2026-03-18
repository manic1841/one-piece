import { collection, doc, orderBy } from 'firebase/firestore';

import { RetirementPlanSchema } from '@/domains/retirement/schemas';
import { type RetirementPlan, type RetirementPlanCreate } from '@/domains/retirement/types';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';

class RetirementRepository extends BaseRepository<RetirementPlan, [string, string?]> {
  private readonly collectionName = 'retirement_plans';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, planId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, planId);
  }

  protected getDomainSchema() {
    return RetirementPlanSchema;
  }

  async getPlans(householdId: string): Promise<RetirementPlan[]> {
    return this.list([householdId], [orderBy('updatedAt', 'desc')]);
  }

  async getPlan(householdId: string, id: string): Promise<RetirementPlan | null> {
    return this.get([householdId, id]);
  }

  async createPlan(
    householdId: string,
    userEmail: string,
    data: RetirementPlanCreate,
  ): Promise<string> {
    return this.create([householdId], data, userEmail);
  }

  async updatePlan(
    householdId: string,
    id: string,
    userEmail: string,
    data: Partial<RetirementPlanCreate>,
  ): Promise<void> {
    await this.update([householdId, id], data, userEmail);
  }

  async deletePlan(householdId: string, id: string): Promise<void> {
    await this.delete([householdId, id]);
  }
}

export const retirementRepository = new RetirementRepository(db);
