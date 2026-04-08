import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type RetirementPlanCreate } from '@/domains/retirement/types';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

interface DuplicateRetirementPlanRequest {
  householdId: string;
  sourcePlanId: string;
  userEmail: string;
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
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

    const sourcePlan = await retirementRepository.getPlan(householdId, sourcePlanId);
    if (!sourcePlan) {
      throw new Error('Retirement plan not found.');
    }

    const duplicatedPlan: RetirementPlanCreate = {
      name: toDuplicateName(sourcePlan.name),
      isActive: false,
      autoUpdate: sourcePlan.autoUpdate,
      currentYear: sourcePlan.currentYear,
      birthYear: sourcePlan.birthYear,
      retirementAge: sourcePlan.retirementAge,
      lifeExpectancy: sourcePlan.lifeExpectancy,
      currentSavings: sourcePlan.currentSavings,
      salaryGrowthRate: sourcePlan.salaryGrowthRate,
      inflationRate: sourcePlan.inflationRate,
      investmentReturnRate: sourcePlan.investmentReturnRate,
      incomes: sourcePlan.incomes,
      expenses: sourcePlan.expenses,
      events: sourcePlan.events,
      retirementTransition: sourcePlan.retirementTransition,
      summary: sourcePlan.summary,
    };

    return retirementRepository.createPlan(householdId, userEmail, duplicatedPlan);
  }
}

export const duplicateRetirementPlanUseCase = new DuplicateRetirementPlanUseCase();
