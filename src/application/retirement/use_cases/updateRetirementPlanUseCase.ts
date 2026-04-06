import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type RetirementPlanCreate } from '@/domains/retirement/types';
import { retirementRepository } from '@/infra/repositories/retirementRepository';
import { logger } from '@/utils/logger';

interface UpdateRetirementPlanRequest {
  householdId: string;
  planId: string;
  updates: Partial<RetirementPlanCreate>;
  userEmail: string;
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

export class UpdateRetirementPlanUseCase {
  async execute(request: UpdateRetirementPlanRequest): Promise<void> {
    const { householdId, planId, updates, userEmail, auth } = request;

    logger.debug('UpdateRetirementPlan started', 'retirement/updateRetirementPlanUseCase', {
      householdId,
      planId,
      userEmail,
      updateKeys: Object.keys(updates),
      hasExpenses: Array.isArray(updates.expenses),
      expensesCount: Array.isArray(updates.expenses) ? updates.expenses.length : undefined,
    });

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    logger.debug('Permission check passed', 'retirement/updateRetirementPlanUseCase', {
      householdId,
      planId,
      uid: auth.uid,
    });

    await retirementRepository.updatePlan(householdId, planId, userEmail, updates);

    logger.debug('Repository updatePlan completed', 'retirement/updateRetirementPlanUseCase', {
      householdId,
      planId,
    });

    if (updates.isActive === true) {
      await retirementRepository.setOnlyActivePlan(householdId, planId, userEmail);
      logger.info('setOnlyActivePlan completed', 'retirement/updateRetirementPlanUseCase', {
        householdId,
        planId,
      });
    }

    logger.info('UpdateRetirementPlan completed', 'retirement/updateRetirementPlanUseCase', {
      householdId,
      planId,
    });
  }
}

export const updateRetirementPlanUseCase = new UpdateRetirementPlanUseCase();
