import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type RetirementPlan } from '@/domains/retirement/types';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

interface ListRetirementPlansRequest {
  householdId: string;
  auth: AuthContext;
}

export class ListRetirementPlansUseCase {
  async execute(request: ListRetirementPlansRequest): Promise<RetirementPlan[]> {
    const { householdId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return retirementRepository.getPlanSummaries(householdId);
  }
}

export const listRetirementPlansUseCase = new ListRetirementPlansUseCase();
