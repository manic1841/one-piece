import {
  RetirementPlanCommandError,
  RetirementPlanCommandErrorCode,
  RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT,
} from '@/application/retirement/retirementPlanErrors';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type RetirementPlanCreate } from '@/domains/retirement/types';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

interface CreateRetirementPlanRequest {
  householdId: string;
  plan: RetirementPlanCreate;
  userEmail: string;
  auth: AuthContext;
}

const estimateCreateWriteCount = (plan: RetirementPlanCreate, existingPlans: number): number =>
  1 + plan.incomes.length + plan.expenses.length + Math.max(existingPlans - 1, 0);

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

      if (
        estimateCreateWriteCount(plan, existingPlans.length) >
        RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT
      ) {
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
