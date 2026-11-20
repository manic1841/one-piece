import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type RetirementPlan } from '@/domains/retirement/types';
import { retirementPlanRepository } from '@/infra/repositories/retirementPlanRepository';

export interface ListRetirementPlansRequest {
  householdId: string;
  auth: AuthContext;
}

/** The repository already sorts `updatedAt` descending. */
export class ListRetirementPlansUseCase {
  async execute(request: ListRetirementPlansRequest): Promise<RetirementPlan[]> {
    const { householdId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return retirementPlanRepository.listPlans(householdId);
  }
}

export const listRetirementPlansUseCase = new ListRetirementPlansUseCase();
