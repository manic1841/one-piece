import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type RetirementPlanCreate } from '@/domains/retirement/types';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

interface CreateRetirementPlanRequest {
  householdId: string;
  plan: RetirementPlanCreate;
  userEmail: string;
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

export class CreateRetirementPlanUseCase {
  async execute(request: CreateRetirementPlanRequest): Promise<string> {
    const { householdId, plan, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const planId = await retirementRepository.createPlan(householdId, userEmail, plan);

    if (plan.isActive) {
      await retirementRepository.setOnlyActivePlan(householdId, planId, userEmail);
    }

    return planId;
  }
}

export const createRetirementPlanUseCase = new CreateRetirementPlanUseCase();
