import {
  type DocumentData,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { z } from 'zod';

import {
  type RetirementPlanCreate,
  type RetirementPlanUpdate,
  createRetirementPlanCreateSchema,
  createRetirementPlanUpdateSchema,
} from '@/domains/retirement/planSchemas';
import { db } from '@/firebase';
import { byteLength, fromFirestore, sanitize } from '@/infra/repositories/firestorePayload';

export const RETIREMENT_PLAN_DOCUMENT_MAX_BYTES = 900_000;

export type RetirementPlanErrorCode = 'PLAN_INVALID' | 'PLAN_NOT_FOUND' | 'PLAN_TOO_LARGE';

export type RetirementPlanWriteResult =
  | { ok: true; id: string }
  | { ok: false; code: RetirementPlanErrorCode; issues?: z.ZodIssue[] };

export type RetirementPlanUpdateResult =
  | { ok: true }
  | { ok: false; code: RetirementPlanErrorCode; issues?: z.ZodIssue[] };

export type RetirementPlan = RetirementPlanCreate & { id: string };

export interface CreateRetirementPlanInput {
  householdId: string;
  currentYear: number;
  plan: RetirementPlanCreate;
  userEmail: string;
}

export interface UpdateRetirementPlanInput {
  householdId: string;
  currentYear: number;
  planId: string;
  plan: RetirementPlanUpdate;
  userEmail: string;
}

const currentYear = (): number => new Date().getFullYear();

function toFirestore(value: RetirementPlanCreate): DocumentData {
  const { createdAt, updatedAt, ...rest } = sanitize(value) as RetirementPlanCreate;

  return {
    ...rest,
    createdAt: Timestamp.fromDate(createdAt),
    updatedAt: Timestamp.fromDate(updatedAt),
  };
}

function parsePlan(id: string, data: DocumentData): RetirementPlan {
  const parsed = createRetirementPlanCreateSchema(currentYear()).parse(fromFirestore(data));
  return { ...parsed, id };
}

class RetirementPlanRepository {
  private readonly collectionName = 'retirementPlans';

  private getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  private getDocRef(householdId: string, planId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, planId);
  }

  async createPlan(input: CreateRetirementPlanInput): Promise<RetirementPlanWriteResult> {
    const { householdId, currentYear: year, plan, userEmail } = input;

    const parsed = createRetirementPlanCreateSchema(year).safeParse(plan);
    if (!parsed.success) {
      return { ok: false, code: 'PLAN_INVALID', issues: parsed.error.issues };
    }

    const docRef = doc(this.getCollectionRef(householdId));
    const payload = toFirestore({
      ...parsed.data,
      createdBy: userEmail,
      updatedBy: userEmail,
    });

    if (byteLength(payload) > RETIREMENT_PLAN_DOCUMENT_MAX_BYTES) {
      return { ok: false, code: 'PLAN_TOO_LARGE' };
    }

    await setDoc(docRef, payload);
    return { ok: true, id: docRef.id };
  }

  async updatePlan(input: UpdateRetirementPlanInput): Promise<RetirementPlanUpdateResult> {
    const { householdId, currentYear: year, planId, plan, userEmail } = input;

    const existingSnapshot = await getDoc(this.getDocRef(householdId, planId));
    if (!existingSnapshot.exists()) {
      return { ok: false, code: 'PLAN_NOT_FOUND' };
    }

    const existing = fromFirestore(existingSnapshot.data()) as Partial<RetirementPlan>;
    const birthYear = existing.assumptions?.birthYear;
    if (typeof birthYear !== 'number') {
      return { ok: false, code: 'PLAN_NOT_FOUND' };
    }

    const parsed = createRetirementPlanUpdateSchema(year, birthYear).safeParse(plan);
    if (!parsed.success) {
      return { ok: false, code: 'PLAN_INVALID', issues: parsed.error.issues };
    }

    const payload = toFirestore({
      ...parsed.data,
      createdBy: existing.createdBy ?? parsed.data.createdBy,
      createdAt: existing.createdAt ?? parsed.data.createdAt,
      updatedBy: userEmail,
    } as RetirementPlanCreate);

    if (byteLength(payload) > RETIREMENT_PLAN_DOCUMENT_MAX_BYTES) {
      return { ok: false, code: 'PLAN_TOO_LARGE' };
    }

    await updateDoc(this.getDocRef(householdId, planId), payload);
    return { ok: true };
  }

  async deletePlan(householdId: string, planId: string): Promise<void> {
    await deleteDoc(this.getDocRef(householdId, planId));
  }

  async getPlan(householdId: string, planId: string): Promise<RetirementPlan | null> {
    const snapshot = await getDoc(this.getDocRef(householdId, planId));
    if (!snapshot.exists()) return null;

    return parsePlan(snapshot.id, snapshot.data());
  }

  async listPlans(householdId: string): Promise<RetirementPlan[]> {
    const snapshot = await getDocs(
      query(this.getCollectionRef(householdId), orderBy('updatedAt', 'desc')),
    );

    return snapshot.docs.map((entry) => parsePlan(entry.id, entry.data()));
  }

  protected readonly db = db;
}

export const retirementPlanRepository = new RetirementPlanRepository();
