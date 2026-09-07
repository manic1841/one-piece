import {
  RetirementPlanCommandError,
  RetirementPlanCommandErrorCode,
} from '@/application/retirement/retirementPlanErrors';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

interface DeleteRetirementPlanRequest {
  householdId: string;
  planId: string;
  auth: AuthContext;
}

export class DeleteRetirementPlanUseCase {
  async execute(request: DeleteRetirementPlanRequest): Promise<void> {
    const { householdId, planId, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    try {
      await retirementRepository.deletePlanAtomically({ householdId, planId });
    } catch (error: unknown) {
      if (error instanceof RetirementPlanCommandError) throw error;

      const message =
        error instanceof Error ? error.message : 'unknown transaction failure';
      throw new RetirementPlanCommandError(
        RetirementPlanCommandErrorCode.TRANSACTION_FAILED,
        message,
      );
    }
  }
}

export const deleteRetirementPlanUseCase = new DeleteRetirementPlanUseCase();
