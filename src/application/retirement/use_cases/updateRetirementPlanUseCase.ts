import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import {
  RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT,
  RetirementPlanCommandError,
  RetirementPlanCommandErrorCode,
  estimateRetirementPlanWriteCount,
} from '@/domains/retirement/retirementPlanErrors';
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
        updates.isActive === true ? await retirementRepository.getPlanSummaries(householdId) : [];

      // Whole-batch replacement deletes every stale child before writing the
      // new list, so both sides count toward the transaction write limit.
      const fanOutUpdateCount =
        updates.isActive === true ? Math.max(existingPlans.length - 1, 0) : 0;
      const writeCount = estimateRetirementPlanWriteCount({
        staleChildCount:
          (updates.incomes
            ? await retirementRepository.countChildren(householdId, planId, 'incomes')
            : 0) +
          (updates.expenses
            ? await retirementRepository.countChildren(householdId, planId, 'expenses')
            : 0),
        newChildCount: (updates.incomes?.length ?? 0) + (updates.expenses?.length ?? 0),
        fanOutUpdateCount,
      });
      if (writeCount > RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT) {
        throw new RetirementPlanCommandError(
          RetirementPlanCommandErrorCode.PLAN_TOO_LARGE,
          'plan write count exceeds the transaction limit',
        );
      }

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
