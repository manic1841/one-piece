import { type DocumentData, collection, doc, orderBy } from 'firebase/firestore';

import { RetirementPlanSchema } from '@/domains/retirement/schemas/retirementSchemas';
import {
  type RetirementPlan,
  type RetirementPlanCreate,
  type RetirementPlanUpdate,
} from '@/domains/retirement/types';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';
import { DOCUMENT_MAX_BYTES, isDocumentTooLarge } from '@/infra/repositories/firestorePayload';

export const RETIREMENT_PLAN_DOCUMENT_MAX_BYTES = DOCUMENT_MAX_BYTES;

export type RetirementPlanErrorCode = 'PLAN_TOO_LARGE';

export type RetirementPlanWriteResult =
  | { ok: true; id: string }
  | { ok: false; code: RetirementPlanErrorCode };

export type RetirementPlanUpdateResult =
  | { ok: true }
  | { ok: false; code: RetirementPlanErrorCode };

export type { RetirementPlan } from '@/domains/retirement/types';

export interface CreateRetirementPlanInput {
  householdId: string;
  plan: RetirementPlanCreate;
  userEmail: string;
}

export interface UpdateRetirementPlanInput {
  householdId: string;
  planId: string;
  plan: RetirementPlanUpdate;
  userEmail: string;
}

/**
 * Retirement plans are validated by the use cases that own the clock; this
 * repository only carries bytes and enforces the per-document size limit.
 */
class RetirementPlanRepository extends BaseRepository<RetirementPlan, [string, string?]> {
  private readonly collectionName = 'retirementPlans';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, planId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, planId);
  }

  protected getDomainSchema() {
    return RetirementPlanSchema;
  }

  private isTooLarge(plan: RetirementPlanCreate | RetirementPlanUpdate): boolean {
    const payload = this.convertToFirestore(plan as RetirementPlan) as DocumentData;
    return isDocumentTooLarge(payload);
  }

  async createPlan(input: CreateRetirementPlanInput): Promise<RetirementPlanWriteResult> {
    const { householdId, plan, userEmail } = input;
    if (this.isTooLarge(plan)) return { ok: false, code: 'PLAN_TOO_LARGE' };

    const id = await this.create([householdId], plan, userEmail);
    return { ok: true, id };
  }

  async updatePlan(input: UpdateRetirementPlanInput): Promise<RetirementPlanUpdateResult> {
    const { householdId, planId, plan, userEmail } = input;
    if (this.isTooLarge(plan)) return { ok: false, code: 'PLAN_TOO_LARGE' };

    // The update payload omits the immutable `birthYear`, so it is not a full
    // `RetirementPlan`; the stored value is left untouched by `updateDoc`.
    await this.update([householdId, planId], plan as Partial<RetirementPlan>, userEmail);
    return { ok: true };
  }

  async deletePlan(householdId: string, planId: string): Promise<void> {
    await this.delete([householdId, planId]);
  }

  async getPlan(householdId: string, planId: string): Promise<RetirementPlan | null> {
    return this.get([householdId, planId]);
  }

  async listPlans(householdId: string): Promise<RetirementPlan[]> {
    return this.list([householdId], [orderBy('updatedAt', 'desc')]);
  }
}

export const retirementPlanRepository = new RetirementPlanRepository(db);
