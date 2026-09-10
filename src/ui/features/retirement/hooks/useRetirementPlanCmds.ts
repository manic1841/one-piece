import { useCallback, useMemo } from 'react';

import { createRetirementPlanUseCase } from '@/application/retirement/use_cases/createRetirementPlanUseCase';
import { deleteRetirementPlanUseCase } from '@/application/retirement/use_cases/deleteRetirementPlanUseCase';
import { duplicateRetirementPlanUseCase } from '@/application/retirement/use_cases/duplicateRetirementPlanUseCase';
import { importRetirementDebtUseCase } from '@/application/retirement/use_cases/importRetirementDebtUseCase';
import { importRetirementIncomeUseCase } from '@/application/retirement/use_cases/importRetirementIncomeUseCase';
import { updateRetirementPlanUseCase } from '@/application/retirement/use_cases/updateRetirementPlanUseCase';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementPlanCreate,
} from '@/domains/retirement/types';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useRetirementPlanCmds(
  householdId: string | undefined,
  userEmail: string | undefined,
) {
  const { currentUser, isAdmin } = useAuth();
  const { loading, error, run } = useLoadingTask();

  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser?.uid, isAdmin],
  );

  const createPlan = useCallback(
    async (plan: RetirementPlanCreate): Promise<string | null> => {
      if (!householdId || !userEmail) return null;
      const result = await run(async () => {
        return createRetirementPlanUseCase.execute({ householdId, plan, userEmail, auth });
      });
      return result || null;
    },
    [householdId, userEmail, auth, run],
  );

  const updatePlan = useCallback(
    async (planId: string, updates: Partial<RetirementPlanCreate>): Promise<void> => {
      if (!householdId || !userEmail) {
        throw new Error('Missing household or user context. Please refresh and try again.');
      }

      const result = await run(async () => {
        try {
          await updateRetirementPlanUseCase.execute({
            householdId,
            planId,
            updates,
            userEmail,
            auth,
          });
          return { ok: true as const };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { ok: false as const, message };
        }
      });

      if (!result || !result.ok) {
        const reason = result && !result.ok ? result.message : 'Unknown error';
        throw new Error(`Failed to update retirement plan in Firestore: ${reason}`);
      }
    },
    [householdId, userEmail, auth, run],
  );

  const deletePlan = useCallback(
    async (planId: string): Promise<void> => {
      if (!householdId) return;
      await run(async () => {
        return deleteRetirementPlanUseCase.execute({ householdId, planId, auth });
      });
    },
    [householdId, auth, run],
  );

  const duplicatePlan = useCallback(
    async (sourcePlanId: string): Promise<string | null> => {
      if (!householdId || !userEmail) return null;
      const result = await run(async () => {
        return duplicateRetirementPlanUseCase.execute({
          householdId,
          sourcePlanId,
          userEmail,
          auth,
        });
      });
      return result || null;
    },
    [householdId, userEmail, auth, run],
  );

  const importIncomeData = useCallback(
    async (): Promise<RetirementIncomeSource[]> => {
      if (!householdId) return [];
      const result = await run(async () => {
        return importRetirementIncomeUseCase.execute({ householdId, auth });
      });
      return result || [];
    },
    [householdId, auth, run],
  );

  const importDebtData = useCallback(
    async (): Promise<RetirementExpenseCategory[]> => {
      if (!householdId) return [];
      const result = await run(async () => {
        return importRetirementDebtUseCase.execute({ householdId, auth });
      });
      return result || [];
    },
    [householdId, auth, run],
  );

  return {
    createPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
    importIncomeData,
    importDebtData,
    loading,
    error,
  };
}
