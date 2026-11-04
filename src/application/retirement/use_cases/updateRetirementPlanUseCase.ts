import { householdPermissionService } from '@/application/household/householdPermissionService';
import { nameFailureCode } from '@/application/retirement/errors';
import { type AuthContext } from '@/application/types';
import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { createRetirementPlanUpdateSchema } from '@/domains/retirement/schemas';
import { type RetirementPlanUpdate } from '@/domains/retirement/types';
import { retirementPlanRepository } from '@/infra/repositories/retirementPlanRepository';

export interface UpdateRetirementPlanRequest {
  householdId: string;
  auth: AuthContext;
  planId: string;
  name: string;
  /** Full draft; omitted fields keep the stored value, which is what a rename does. */
  assumptions?: RetirementAssumptions;
  projectionRules?: ProjectionRule[];
  lifeEvents?: LifeEvent[];
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
 * Plan update. `birthYear` is immutable, so the stored plan is read and its
 * birth year is excluded from the input (the update schema takes it as an
 * anchor). A request without a draft updates only the name.
 */
export class UpdateRetirementPlanUseCase {
  async execute(request: UpdateRetirementPlanRequest): Promise<UpdateRetirementPlanOutcome> {
    const { householdId, planId, name, auth, projectionRules, lifeEvents } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const existing = await retirementPlanRepository.getPlan(householdId, planId);
    if (existing === null) return { ok: false, code: 'PLAN_NOT_FOUND' };

    const { birthYear } = existing.assumptions;
    const assumptions = request.assumptions ?? existing.assumptions;
    const updatedAt = new Date();
    const userEmail = auth.email ?? auth.uid;

    const parsed = createRetirementPlanUpdateSchema(updatedAt.getFullYear(), birthYear).safeParse({
      name,
      assumptions,
      projectionRules: projectionRules ?? existing.projectionRules,
      lifeEvents: lifeEvents ?? existing.lifeEvents,
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
      // `updateDoc` replaces the whole `assumptions` object, so the immutable
      // anchor travels with it even though the update schema omits it.
      plan: {
        ...parsed.data,
        assumptions: {
          ...parsed.data.assumptions,
          birthYear,
        } as RetirementPlanUpdate['assumptions'],
      },
    });
    if (!result.ok) return { ok: false, code: result.code };

    return { ok: true, name: parsed.data.name };
  }
}

export const updateRetirementPlanUseCase = new UpdateRetirementPlanUseCase();
