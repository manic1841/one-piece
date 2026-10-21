import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { db } from '@/firebase';

const COLLECTION = 'retirementPlans';

export interface RetirementPlanSummary {
  id: string;
  name: string;
}

/** Plan data the workspace needs; the repository lands in #339. */
export interface RetirementPlanWorkspaceData {
  id: string;
  name: string;
  assumptions: RetirementAssumptions;
  rules: ProjectionRule[];
  lifeEvents: LifeEvent[];
}

export async function listRetirementPlanSummaries(
  householdId: string,
): Promise<RetirementPlanSummary[]> {
  const snapshot = await getDocs(collection(db, 'households', householdId, COLLECTION));
  return snapshot.docs.map((entry) => ({
    id: entry.id,
    name: String(entry.data().name ?? ''),
  }));
}

export async function getRetirementPlanForWorkspace(
  householdId: string,
  planId: string,
): Promise<RetirementPlanWorkspaceData | null> {
  const snapshot = await getDoc(doc(db, 'households', householdId, COLLECTION, planId));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    assumptions: data.assumptions as RetirementAssumptions,
    rules: (data.projectionRules ?? []) as ProjectionRule[],
    lifeEvents: (data.lifeEvents ?? []) as LifeEvent[],
  };
}
