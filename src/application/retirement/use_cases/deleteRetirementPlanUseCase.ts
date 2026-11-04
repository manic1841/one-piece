import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { retirementPlanRepository } from '@/infra/repositories/retirementPlanRepository';

export interface DeleteRetirementPlanRequest {
  householdId: string;
  auth: AuthContext;
  planId: string;
}

export class DeleteRetirementPlanUseCase {
  async execute(request: DeleteRetirementPlanRequest): Promise<void> {
    const { householdId, planId, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    await retirementPlanRepository.deletePlan(householdId, planId);
  }
}

export const deleteRetirementPlanUseCase = new DeleteRetirementPlanUseCase();
