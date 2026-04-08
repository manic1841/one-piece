import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type RetirementPlan } from '@/domains/retirement/types';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

interface ListRetirementPlansRequest {
  householdId: string;
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

export class ListRetirementPlansUseCase {
  async execute(request: ListRetirementPlansRequest): Promise<RetirementPlan[]> {
    const { householdId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return retirementRepository.getPlans(householdId);
  }
}

export const listRetirementPlansUseCase = new ListRetirementPlansUseCase();
