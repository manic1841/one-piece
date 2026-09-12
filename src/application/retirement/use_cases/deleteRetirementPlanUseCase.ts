import {
  RetirementPlanCommandError,
  RetirementPlanCommandErrorCode,
  RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT,
  estimateRetirementPlanWriteCount,
} from '@/domains/retirement/retirementPlanErrors';
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
      const writeCount = estimateRetirementPlanWriteCount({
        staleChildCount:
          (await retirementRepository.countChildren(householdId, planId, 'incomes')) +
          (await retirementRepository.countChildren(householdId, planId, 'expenses')),
        newChildCount: 0,
        fanOutUpdateCount: 0,
      });
      if (writeCount > RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT) {
        throw new RetirementPlanCommandError(
          RetirementPlanCommandErrorCode.PLAN_TOO_LARGE,
          'plan write count exceeds the transaction limit',
        );
      }

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
