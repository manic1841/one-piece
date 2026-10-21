import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type RetirementPlan } from '@/domains/retirement/types';
import { retirementPlanRepository } from '@/infra/repositories/retirementPlanRepository';

export interface GetRetirementPlanRequest {
  householdId: string;
  auth: AuthContext;
  planId: string;
}

export class GetRetirementPlanUseCase {
  async execute(request: GetRetirementPlanRequest): Promise<RetirementPlan | null> {
    const { householdId, planId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return retirementPlanRepository.getPlan(householdId, planId);
  }
}

export const getRetirementPlanUseCase = new GetRetirementPlanUseCase();
