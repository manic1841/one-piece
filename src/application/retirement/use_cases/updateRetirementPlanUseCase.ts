import { householdPermissionService } from '@/application/household/householdPermissionService';
import { nameFailureCode } from '@/application/retirement/errors';
import { type AuthContext } from '@/application/types';
import { createRetirementPlanUpdateSchema } from '@/domains/retirement/schemas/retirementSchemas';
import { retirementPlanRepository } from '@/infra/repositories/retirementPlanRepository';

export interface UpdateRetirementPlanRequest {
  householdId: string;
  auth: AuthContext;
  planId: string;
  name: string;
}

export type UpdateRetirementPlanOutcome =
  | { ok: true; name: string }
  | {
      ok: false;
      code:
        | 'NAME_REQUIRED'
        | 'NAME_TOO_LONG'
        | 'PLAN_INVALID'
        | 'PLAN_NOT_FOUND'
        | 'PLAN_TOO_LARGE';
    };

/**
 * Name-only update for now: `birthYear` is immutable, so the stored plan is
 * read and its birth year is excluded while every other field is carried
 * through unchanged.
 */
export class UpdateRetirementPlanUseCase {
  async execute(request: UpdateRetirementPlanRequest): Promise<UpdateRetirementPlanOutcome> {
    const { householdId, planId, name, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const existing = await retirementPlanRepository.getPlan(householdId, planId);
    if (existing === null) return { ok: false, code: 'PLAN_NOT_FOUND' };

    const { birthYear, ...assumptions } = existing.assumptions;
    const updatedAt = new Date();
    const userEmail = auth.email ?? auth.uid;

    const parsed = createRetirementPlanUpdateSchema(updatedAt.getFullYear(), birthYear).safeParse({
      name,
      assumptions,
      projectionRules: existing.projectionRules,
      lifeEvents: existing.lifeEvents,
      createdBy: existing.createdBy,
      updatedBy: userEmail,
      createdAt: existing.createdAt,
      updatedAt,
    });

    if (!parsed.success) {
      const nameFailure = nameFailureCode(parsed.error.issues);
      if (nameFailure !== null) return { ok: false, code: nameFailure };
      return { ok: false, code: 'PLAN_INVALID' };
    }

    const result = await retirementPlanRepository.updatePlan({
      householdId,
      planId,
      userEmail,
      plan: parsed.data,
    });
    if (!result.ok) return { ok: false, code: result.code };

    return { ok: true, name: parsed.data.name };
  }
}

export const updateRetirementPlanUseCase = new UpdateRetirementPlanUseCase();
