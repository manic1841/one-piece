import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type RetirementPlanCreate } from '@/domains/retirement/types';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

interface UpdateRetirementPlanRequest {
  householdId: string;
  planId: string;
  updates: Partial<RetirementPlanCreate>;
  userEmail: string;
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

export class UpdateRetirementPlanUseCase {
  async execute(request: UpdateRetirementPlanRequest): Promise<void> {
    const { householdId, planId, updates, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return retirementRepository.updatePlan(householdId, planId, userEmail, updates);
  }
}

export const updateRetirementPlanUseCase = new UpdateRetirementPlanUseCase();
