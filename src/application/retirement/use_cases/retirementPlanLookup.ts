import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import {
  type RetirementPlan,
  retirementPlanRepository,
} from '@/infra/repositories/retirementPlanRepository';

export type { RetirementPlan } from '@/infra/repositories/retirementPlanRepository';

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
  const plans = await retirementPlanRepository.listPlans(householdId);
  return plans.map(({ id, name }) => ({ id, name }));
}

export async function getRetirementPlanForWorkspace(
  householdId: string,
  planId: string,
): Promise<RetirementPlanWorkspaceData | null> {
  const plan = await retirementPlanRepository.getPlan(householdId, planId);
  if (plan === null) return null;

  return {
    id: plan.id,
    name: plan.name,
    assumptions: plan.assumptions,
    rules: plan.projectionRules,
    lifeEvents: plan.lifeEvents,
  };
}

interface AuthenticatedPlanRequest {
  householdId: string;
  auth: AuthContext;
}

/** Plan list. The repository already sorts `updatedAt` descending. */
export async function listRetirementPlans(
  request: AuthenticatedPlanRequest,
): Promise<RetirementPlan[]> {
  const { householdId, auth } = request;
  await householdPermissionService.assertReadPermission(householdId, auth.uid, auth.isGlobalAdmin);
  return retirementPlanRepository.listPlans(householdId);
}

export async function getRetirementPlan(
  request: AuthenticatedPlanRequest & { planId: string },
): Promise<RetirementPlan | null> {
  const { householdId, planId, auth } = request;
  await householdPermissionService.assertReadPermission(householdId, auth.uid, auth.isGlobalAdmin);
  return retirementPlanRepository.getPlan(householdId, planId);
}

export type RenameRetirementPlanResult =
  | { ok: true; plan: RetirementPlan }
  | { ok: false; code: 'PLAN_NOT_FOUND' | 'PLAN_INVALID' | 'PLAN_TOO_LARGE' };

/**
 * Rename-only update. The persisted `birthYear` is immutable, so it is read
 * from the stored plan and excluded from the update payload while every other
 * field is carried through unchanged.
 */
export async function renameRetirementPlan(
  request: AuthenticatedPlanRequest & { planId: string; name: string; userEmail: string },
): Promise<RenameRetirementPlanResult> {
  const { householdId, planId, name, userEmail, auth } = request;
  await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);

  const existing = await retirementPlanRepository.getPlan(householdId, planId);
  if (existing === null) return { ok: false, code: 'PLAN_NOT_FOUND' };

  const { birthYear, ...assumptions } = existing.assumptions;
  void birthYear;
  const updatedAt = new Date();
  const result = await retirementPlanRepository.updatePlan({
    householdId,
    currentYear: new Date().getFullYear(),
    planId,
    userEmail,
    plan: {
      ...existing,
      name,
      assumptions,
      updatedAt,
    },
  });

  if (!result.ok) return result;

  return { ok: true, plan: { ...existing, name: name.trim(), updatedAt } };
}

export async function deleteRetirementPlan(
  request: AuthenticatedPlanRequest & { planId: string },
): Promise<void> {
  const { householdId, planId, auth } = request;
  await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
  await retirementPlanRepository.deletePlan(householdId, planId);
}
