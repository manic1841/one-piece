import { householdPermissionService } from '@/application/household/householdPermissionService';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

interface DeleteRetirementPlanRequest {
  householdId: string;
  planId: string;
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

export class DeleteRetirementPlanUseCase {
  async execute(request: DeleteRetirementPlanRequest): Promise<void> {
    const { householdId, planId, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return retirementRepository.deletePlan(householdId, planId);
  }
}

export const deleteRetirementPlanUseCase = new DeleteRetirementPlanUseCase();
