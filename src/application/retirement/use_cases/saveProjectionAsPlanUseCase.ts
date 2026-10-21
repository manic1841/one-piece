import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { RetirementSchemaErrorCode } from '@/domains/retirement/errorCodes';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { createRetirementPlanCreateSchema } from '@/domains/retirement/planSchemas';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { projectionRepository } from '@/infra/repositories/projectionRepository';
import { retirementPlanRepository } from '@/infra/repositories/retirementPlanRepository';

export interface PlanDraft {
  name: string;
  assumptions: RetirementAssumptions;
  projectionRules: ProjectionRule[];
  lifeEvents: LifeEvent[];
}

export type SaveAsPlanErrorCode =
  | 'NAME_REQUIRED'
  | 'NAME_TOO_LONG'
  | 'PLAN_INVALID'
  | 'PLAN_TOO_LARGE'
  | 'PLAN_NOT_FOUND'
  | 'PROJECTION_NOT_FOUND'
  | 'WRITE_FAILED';

export type SaveAsPlanOutcome = { ok: true; id: string } | { ok: false; code: SaveAsPlanErrorCode };

interface SaveRequest {
  householdId: string;
  name: string;
  auth: AuthContext;
}

async function writePlan(
  request: SaveRequest & Omit<PlanDraft, 'name'>,
): Promise<SaveAsPlanOutcome> {
  const { householdId, auth, assumptions, projectionRules, lifeEvents } = request;

  await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);

  const now = new Date();
  const userEmail = auth.email ?? auth.uid;
  const parsed = createRetirementPlanCreateSchema(now.getFullYear()).safeParse({
    name: request.name,
    assumptions,
    projectionRules,
    lifeEvents,
    createdBy: userEmail,
    updatedBy: userEmail,
    createdAt: now,
    updatedAt: now,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    if (
      message === RetirementSchemaErrorCode.NAME_REQUIRED ||
      message === RetirementSchemaErrorCode.NAME_TOO_LONG
    ) {
      return { ok: false, code: message };
    }
    return { ok: false, code: 'PLAN_INVALID' };
  }

  try {
    const written = await retirementPlanRepository.createPlan({
      householdId,
      currentYear: now.getFullYear(),
      userEmail,
      plan: parsed.data,
    });
    if (!written.ok) return { ok: false, code: written.code };
    return { ok: true, id: written.id };
  } catch {
    return { ok: false, code: 'WRITE_FAILED' };
  }
}

/** Creates a new, independent plan from a projection's frozen config. */
export class SaveProjectionAsPlanUseCase {
  async execute(request: SaveRequest & { projectionId: string }): Promise<SaveAsPlanOutcome> {
    const { householdId, projectionId, name, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const config = await projectionRepository.getProjectionConfig(householdId, projectionId);
    if (config === null) return { ok: false, code: 'PROJECTION_NOT_FOUND' };

    return writePlan({
      householdId,
      name,
      auth,
      assumptions: config.assumptions,
      projectionRules: config.projectionRules,
      lifeEvents: config.lifeEvents,
    });
  }
}

/** Creates a plan from the workspace's current validated setup, without calculating. */
export class SaveWorkspaceAsPlanUseCase {
  async execute(request: SaveRequest & Omit<PlanDraft, 'name'>): Promise<SaveAsPlanOutcome> {
    return writePlan(request);
  }
}

export const saveProjectionAsPlanUseCase = new SaveProjectionAsPlanUseCase();
export const saveWorkspaceAsPlanUseCase = new SaveWorkspaceAsPlanUseCase();
