import { householdPermissionService } from '@/application/household/householdPermissionService';
import { nameFailureCode } from '@/application/retirement/errors';
import { type AuthContext } from '@/application/types';
import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { createRetirementPlanCreateSchema } from '@/domains/retirement/schemas/retirementSchemas';
import { retirementPlanRepository } from '@/infra/repositories/retirementPlanRepository';

export interface CreateRetirementPlanRequest {
  householdId: string;
  auth: AuthContext;
  name: string;
  assumptions: RetirementAssumptions;
  projectionRules: ProjectionRule[];
  lifeEvents: LifeEvent[];
}

export type CreateRetirementPlanErrorCode =
  | 'NAME_REQUIRED'
  | 'NAME_TOO_LONG'
  | 'PLAN_INVALID'
  | 'PLAN_TOO_LARGE';

export type CreateRetirementPlanOutcome =
  | { ok: true; id: string }
  | { ok: false; code: CreateRetirementPlanErrorCode };

export class CreateRetirementPlanUseCase {
  async execute(request: CreateRetirementPlanRequest): Promise<CreateRetirementPlanOutcome> {
    const { householdId, auth, name, assumptions, projectionRules, lifeEvents } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const now = new Date();
    const userEmail = auth.email ?? auth.uid;
    const parsed = createRetirementPlanCreateSchema(now.getFullYear()).safeParse({
      name,
      assumptions,
      projectionRules,
      lifeEvents,
      createdBy: userEmail,
      updatedBy: userEmail,
      createdAt: now,
      updatedAt: now,
    });

    if (!parsed.success) {
      const nameFailure = nameFailureCode(parsed.error.issues);
      if (nameFailure !== null) return { ok: false, code: nameFailure };
      return { ok: false, code: 'PLAN_INVALID' };
    }

    const written = await retirementPlanRepository.createPlan({
      householdId,
      userEmail,
      plan: parsed.data,
    });
    if (!written.ok) return { ok: false, code: written.code };
    return { ok: true, id: written.id };
  }
}

export const createRetirementPlanUseCase = new CreateRetirementPlanUseCase();
