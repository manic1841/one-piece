import { type PlanDraft } from '@/application/retirement/types';
import { createRetirementPlanUseCase } from '@/application/retirement/use_cases/createRetirementPlanUseCase';
import { type AuthContext } from '@/application/types';

export interface SaveWorkspaceAsPlanRequest extends PlanDraft {
  householdId: string;
  auth: AuthContext;
}

/**
 * Saves the workspace draft as a new plan. The workspace has already validated
 * the draft; the create use case owns the permission check and the final schema
 * check.
 */
export class SaveWorkspaceAsPlanWorkflow {
  async execute(request: SaveWorkspaceAsPlanRequest) {
    const { householdId, auth, ...draft } = request;

    return createRetirementPlanUseCase.execute({ ...draft, householdId, auth });
  }
}

export const saveWorkspaceAsPlanWorkflow = new SaveWorkspaceAsPlanWorkflow();
