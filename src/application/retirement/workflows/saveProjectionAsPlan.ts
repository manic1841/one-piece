import {
  type CreateRetirementPlanErrorCode,
  createRetirementPlanUseCase,
} from '@/application/retirement/use_cases/createRetirementPlanUseCase';
import { type AuthContext } from '@/application/types';
import { projectionRepository } from '@/infra/repositories/projectionRepository';

export type SaveAsPlanErrorCode = CreateRetirementPlanErrorCode | 'PROJECTION_NOT_FOUND';

export type SaveAsPlanOutcome = { ok: true; id: string } | { ok: false; code: SaveAsPlanErrorCode };

interface SaveProjectionAsPlanWorkflowRequest {
  householdId: string;
  projectionId: string;
  name: string;
  auth: AuthContext;
}

/** Creates a new, independent plan from a projection's frozen config. */
export class SaveProjectionAsPlanWorkflow {
  async execute(request: SaveProjectionAsPlanWorkflowRequest): Promise<SaveAsPlanOutcome> {
    const { householdId, projectionId, name, auth } = request;

    const config = await projectionRepository.getProjectionConfig(householdId, projectionId);
    if (config === null) return { ok: false, code: 'PROJECTION_NOT_FOUND' };

    // `createRetirementPlanUseCase` owns the write permission check.
    return createRetirementPlanUseCase.execute({
      householdId,
      auth,
      name,
      assumptions: config.assumptions,
      projectionRules: config.projectionRules,
      lifeEvents: config.lifeEvents,
    });
  }
}

export const saveProjectionAsPlanWorkflow = new SaveProjectionAsPlanWorkflow();
