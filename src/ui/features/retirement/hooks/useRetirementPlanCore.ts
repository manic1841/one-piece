import { useCallback, useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { getStartingNetWorthUseCase } from '@/application/retirement/use_cases/getStartingNetWorthUseCase';
import type { StartingNetWorthSource } from '@/application/retirement/use_cases/getStartingNetWorthUseCase';
import { importRetirementDebtUseCase } from '@/application/retirement/use_cases/importRetirementDebtUseCase';
import { importRetirementExpensesUseCase } from '@/application/retirement/use_cases/importRetirementExpensesUseCase';
import { importRetirementIncomeUseCase } from '@/application/retirement/use_cases/importRetirementIncomeUseCase';
import { syncImportedIncomeSourcesUseCase } from '@/application/retirement/use_cases/syncImportedIncomeSourcesUseCase';
import {
  calculateProjectionSummary,
  calculateRetirementProjection,
} from '@/domains/retirement/logic/retirementCalculator';
import type { RetirementPlan, RetirementPlanCreate } from '@/domains/retirement/types';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';
import { useRetirementPlans } from '@/ui/features/retirement/hooks/useRetirementPlans';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

interface UseRetirementPlanCoreParams {
  id: string | undefined;
  householdId: string | undefined;
  userEmail: string | undefined;
}

export interface StaleIncomeSyncBannerState {
  staleCount: number;
  targetSampleYear: number;
  incomes: RetirementPlan['incomes'];
  hasChanges: boolean;
}

export const useRetirementPlanCore = ({
  id,
  householdId,
  userEmail,
}: UseRetirementPlanCoreParams) => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const auth = useAuthIdentity();
  const [plan, setPlan] = useState<RetirementPlan | null>(null);
  const [staleIncomeSyncBanner, setStaleIncomeSyncBanner] =
    useState<StaleIncomeSyncBannerState | null>(null);
  const [netWorthSource, setNetWorthSource] = useState<StartingNetWorthSource | null>(null);
  const autoSyncingRef = useRef(false);

  const { getPlan, loading: planLoading, error: planError } = useRetirementPlans(householdId);
  const { updatePlan, deletePlan } = useRetirementPlanCmds(householdId, userEmail);

  // Read-only ledger imports: reads belong here in the Controller, not in `*Cmds`.
  const importIncomeData = useCallback(async () => {
    if (!householdId) return [];
    return importRetirementIncomeUseCase.execute({ householdId, auth });
  }, [householdId, auth]);

  const importDebtData = useCallback(async () => {
    if (!householdId) return [];
    return importRetirementDebtUseCase.execute({ householdId, auth });
  }, [householdId, auth]);

  const importExpenseDataFromLedger = useCallback(async () => {
    if (!householdId) return [];
    return importRetirementExpensesUseCase.execute({ householdId, auth });
  }, [householdId, auth]);

  const loadPlanToken = plan?.updatedAt?.getTime();

  const loadPlan = useCallback(async () => {
    if (!id || !householdId) return;
    const result = await getPlan(id);
    if (result.ok && result.value) {
      setPlan(result.value);
    }
  }, [id, householdId, getPlan]);

  useEffect(() => {
    const init = async () => {
      await loadPlan();
      if (householdId) {
        const source = await getStartingNetWorthUseCase.execute({ householdId, auth });
        setNetWorthSource(source);
      }
    };
    void init();
  }, [loadPlan, loadPlanToken, householdId, auth]);

  const handleUpdatePlan = useCallback(
    async (updates: Partial<RetirementPlanCreate>) => {
      if (!id || !plan) {
        throw new Error('Retirement plan is not ready yet. Please wait and try again.');
      }
      logger.debug('handleUpdatePlan started', 'retirement/useRetirementPlanCore', {
        planId: id,
        updateKeys: Object.keys(updates),
        hasExpenses: Array.isArray(updates.expenses),
        expensesCount: Array.isArray(updates.expenses) ? updates.expenses.length : undefined,
      });
      try {
        await updatePlan(id, updates);
        logger.debug('handleUpdatePlan updatePlan completed', 'retirement/useRetirementPlanCore', {
          planId: id,
          updateKeys: Object.keys(updates),
        });
        await loadPlan();
        logger.info('handleUpdatePlan loadPlan completed', 'retirement/useRetirementPlanCore', {
          planId: id,
        });
      } catch (error) {
        logger.error('handleUpdatePlan failed', 'retirement/useRetirementPlanCore', {
          planId: id,
          error: error instanceof Error ? error.message : String(error),
          updateKeys: Object.keys(updates),
        });
        console.error('Failed to update plan', error);
        throw error;
      }
    },
    [id, plan, updatePlan, loadPlan],
  );

  const handleToggleAutoUpdate = useCallback(async () => {
    if (!id || !plan) return;
    await handleUpdatePlan({ autoUpdate: !plan.autoUpdate });
  }, [id, plan, handleUpdatePlan]);

  const handleRecalculate = useCallback(async () => {
    if (!id || !plan || !householdId) return;
    try {
      const source = await getStartingNetWorthUseCase.execute({ householdId, auth });
      if ('reason' in source) {
        logger.warn(
          'No closed period; projection not recalculated',
          'retirement/useRetirementPlanCore',
          { planId: id },
        );
        return;
      }
      const projection = calculateRetirementProjection(plan, source.startingNetWorth);
      const summary = calculateProjectionSummary(
        projection,
        plan,
        source.startingNetWorth,
        source.anchorYearMonth,
      );

      await updatePlan(id, {
        summary: {
          ...summary,
          lastCalculatedAt: new Date(),
        },
      });
      await loadPlan();
    } catch (error) {
      console.error('Failed to recalculate', error);
    }
  }, [id, plan, householdId, auth, updatePlan, loadPlan]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    const confirmed = await confirm('Delete this plan?');
    if (!confirmed) return;
    try {
      await deletePlan(id);
      navigate('/retirement');
    } catch (error) {
      console.error('Failed to delete plan', error);
    }
  }, [id, confirm, deletePlan, navigate]);

  const handleSaveName = useCallback(
    async (name: string) => {
      if (!id || !plan || !name.trim()) return;
      await handleUpdatePlan({
        name: name.trim(),
      });
    },
    [id, plan, handleUpdatePlan],
  );

  const syncAutoUpdatedImportedIncomes = useCallback(async () => {
    if (!id || !plan || !householdId || !plan.autoUpdate || autoSyncingRef.current) {
      return;
    }

    autoSyncingRef.current = true;
    try {
      const syncResult = await syncImportedIncomeSourcesUseCase.execute({
        householdId,
        plan,
      });

      setStaleIncomeSyncBanner(
        syncResult.staleCount > 0
          ? {
              staleCount: syncResult.staleCount,
              targetSampleYear: syncResult.targetSampleYear,
              incomes: syncResult.incomes,
              hasChanges: syncResult.hasChanges,
            }
          : null,
      );
    } catch (error) {
      console.error('Failed to auto-sync imported income sources', error);
    } finally {
      autoSyncingRef.current = false;
    }
  }, [householdId, id, plan]);

  useEffect(() => {
    if (!plan?.autoUpdate) return;
    void syncAutoUpdatedImportedIncomes();
  }, [plan?.autoUpdate, syncAutoUpdatedImportedIncomes]);

  const handleApplyStaleIncomeSync = useCallback(async () => {
    if (!staleIncomeSyncBanner) {
      return;
    }

    if (staleIncomeSyncBanner.hasChanges) {
      await handleUpdatePlan({ incomes: staleIncomeSyncBanner.incomes });
    }
    setStaleIncomeSyncBanner(null);
  }, [staleIncomeSyncBanner, handleUpdatePlan]);

  const handleDismissStaleIncomeSync = useCallback(() => {
    setStaleIncomeSyncBanner(null);
  }, []);

  return {
    plan,
    loading: planLoading,
    error: planError,
    netWorthSource,
    staleIncomeSyncBanner,
    handleApplyStaleIncomeSync,
    handleDismissStaleIncomeSync,
    handleUpdatePlan,
    handleToggleAutoUpdate,
    handleRecalculate,
    handleDelete,
    handleSaveName,
    importIncomeData,
    importDebtData,
    importExpenseDataFromLedger,
  };
};
