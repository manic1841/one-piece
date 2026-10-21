import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type PlanDraft } from '@/application/retirement/types';
import { createRetirementPlanUseCase } from '@/application/retirement/use_cases/createRetirementPlanUseCase';
import { type AuthContext } from '@/application/types';

export interface SaveWorkspaceAsPlanRequest extends PlanDraft {
  householdId: string;
  auth: AuthContext;
}

/**
 * Saves the workspace draft as a new plan. The workspace has already validated
 * the draft; the create use case owns the final schema check.
 */
export class SaveWorkspaceAsPlanUseCase {
  async execute(request: SaveWorkspaceAsPlanRequest) {
    const { householdId, auth, ...draft } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return createRetirementPlanUseCase.execute({ ...draft, householdId, auth });
  }
}

export const saveWorkspaceAsPlanUseCase = new SaveWorkspaceAsPlanUseCase();
