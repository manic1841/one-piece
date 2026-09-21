import {
  RetirementPlanCommandError,
  RetirementPlanCommandErrorCode,
} from '@/domains/retirement/retirementPlanErrors';
import { type AuthContext } from '@/application/types';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type RetirementPlanCreate } from '@/domains/retirement/types';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

interface DuplicateRetirementPlanRequest {
  householdId: string;
  sourcePlanId: string;
  userEmail: string;
  auth: AuthContext;
}

const toDuplicateName = (name: string): string => `${name} (Copy)`;

export class DuplicateRetirementPlanUseCase {
  async execute(request: DuplicateRetirementPlanRequest): Promise<string> {
    const { householdId, sourcePlanId, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    try {
      const sourcePlan = await retirementRepository.getPlan(householdId, sourcePlanId);
      if (!sourcePlan) {
        throw new RetirementPlanCommandError(
          RetirementPlanCommandErrorCode.PLAN_NOT_FOUND,
          'Retirement plan not found.',
        );
      }

      const duplicatedPlan: RetirementPlanCreate = {
        name: toDuplicateName(sourcePlan.name),
        isActive: false,
        autoUpdate: sourcePlan.autoUpdate,
        currentYear: sourcePlan.currentYear,
        birthYear: sourcePlan.birthYear,
        retirementAge: sourcePlan.retirementAge,
        lifeExpectancy: sourcePlan.lifeExpectancy,
        inflationRate: sourcePlan.inflationRate,
        investmentReturnRate: sourcePlan.investmentReturnRate,
        incomes: sourcePlan.incomes,
        expenses: sourcePlan.expenses,
        events: sourcePlan.events,
        summary: sourcePlan.summary,
      };

      return await retirementRepository.createPlanAtomically({
        householdId,
        plan: duplicatedPlan,
        userEmail,
        existingPlans: [],
      });
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

export const duplicateRetirementPlanUseCase = new DuplicateRetirementPlanUseCase();
