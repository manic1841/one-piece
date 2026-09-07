import {
  RetirementPlanCommandError,
  RetirementPlanCommandErrorCode,
} from '@/application/retirement/retirementPlanErrors';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type RetirementPlanCreate } from '@/domains/retirement/types';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

interface UpdateRetirementPlanRequest {
  householdId: string;
  planId: string;
  updates: Partial<RetirementPlanCreate>;
  userEmail: string;
  auth: AuthContext;
}

export class UpdateRetirementPlanUseCase {
  async execute(request: UpdateRetirementPlanRequest): Promise<void> {
    const { householdId, planId, updates, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    try {
      const existingPlans =
        updates.isActive === true
          ? await retirementRepository.getPlanSummaries(householdId)
          : [];

      await retirementRepository.updatePlanAtomically({
        householdId,
        planId,
        updates,
        userEmail,
        existingPlans,
      });
    } catch (error: unknown) {
      if (error instanceof RetirementPlanCommandError) throw error;

      const message = error instanceof Error ? error.message : 'unknown transaction failure';
      throw new RetirementPlanCommandError(
        RetirementPlanCommandErrorCode.TRANSACTION_FAILED,
        message,
      );
    }
  }
}

export const updateRetirementPlanUseCase = new UpdateRetirementPlanUseCase();
