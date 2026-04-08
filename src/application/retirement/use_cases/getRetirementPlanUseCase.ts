import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type RetirementPlan } from '@/domains/retirement/types';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

interface GetRetirementPlanRequest {
  householdId: string;
  planId: string;
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

export class GetRetirementPlanUseCase {
  async execute(request: GetRetirementPlanRequest): Promise<RetirementPlan | null> {
    const { householdId, planId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return retirementRepository.getPlan(householdId, planId);
  }
}

export const getRetirementPlanUseCase = new GetRetirementPlanUseCase();
