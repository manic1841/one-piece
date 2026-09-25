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

interface CreateRetirementPlanRequest {
  householdId: string;
  plan: RetirementPlanCreate;
  userEmail: string;
  auth: AuthContext;
}

export class CreateRetirementPlanUseCase {
  async execute(request: CreateRetirementPlanRequest): Promise<string> {
    const { householdId, plan, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    try {
      const existingPlans = plan.isActive
        ? await retirementRepository.getPlanSummaries(householdId)
        : [];

      // The new plan itself is not among existingPlans, so all of them may
      // need a fan-out update.
      const writeCount = estimateRetirementPlanWriteCount({
        staleChildCount: 0,
        newChildCount: plan.incomes.length + plan.expenses.length,
        fanOutUpdateCount: plan.isActive ? existingPlans.length : 0,
      });
      if (writeCount > RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT) {
        throw new RetirementPlanCommandError(
          RetirementPlanCommandErrorCode.PLAN_TOO_LARGE,
          'plan write count exceeds the transaction limit',
        );
      }

      return await retirementRepository.createPlanAtomically({
        householdId,
        plan,
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

export const createRetirementPlanUseCase = new CreateRetirementPlanUseCase();
