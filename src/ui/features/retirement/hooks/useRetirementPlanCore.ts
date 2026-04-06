import { useCallback, useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { syncImportedIncomeSourcesUseCase } from '@/application/retirement/use_cases/syncImportedIncomeSourcesUseCase';
import {
  calculateProjectionSummary,
  calculateRetirementProjection,
} from '@/domains/retirement/logic/retirementCalculator';
import type { RetirementPlan, RetirementPlanCreate } from '@/domains/retirement/types';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';
import { useRetirementPlans } from '@/ui/features/retirement/hooks/useRetirementPlans';
import { logger } from '@/utils/logger';

interface UseRetirementPlanCoreParams {
  id: string | undefined;
  householdId: string | undefined;
  userEmail: string | undefined;
}

export const useRetirementPlanCore = ({
  id,
  householdId,
  userEmail,
}: UseRetirementPlanCoreParams) => {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<RetirementPlan | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const autoSyncingRef = useRef(false);

  const { getPlan, loading: planLoading, error: planError } = useRetirementPlans(householdId);
  const { updatePlan, deletePlan, importData } = useRetirementPlanCmds(householdId, userEmail);

  const loadPlanToken = plan?.updatedAt?.getTime();

  const loadPlan = useCallback(async () => {
    if (!id || !householdId) return;
    const data = await getPlan(id);
    if (data) {
      setPlan(data);
      setEditedName(data.name);
    }
  }, [id, householdId, getPlan]);

  useEffect(() => {
    const init = async () => {
      await loadPlan();
    };
    void init();
  }, [loadPlan, loadPlanToken]);

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
    if (!id || !plan) return;
    try {
      const projection = calculateRetirementProjection(plan);
      const summary = calculateProjectionSummary(projection, plan);

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
  }, [id, plan, updatePlan, loadPlan]);

  const handleDelete = useCallback(async () => {
    if (!id || !window.confirm('Delete this plan?')) return;
    try {
      await deletePlan(id);
      navigate('/retirement');
    } catch (error) {
      console.error('Failed to delete plan', error);
    }
  }, [id, deletePlan, navigate]);

  const handleSaveName = useCallback(async () => {
    if (!id || !plan || !editedName.trim()) return;
    await handleUpdatePlan({
      name: editedName.trim(),
    });
    setIsEditingName(false);
  }, [id, plan, editedName, handleUpdatePlan]);

  const handleCancelEditName = useCallback(() => {
    setEditedName(plan?.name || '');
    setIsEditingName(false);
  }, [plan?.name]);

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

      if (syncResult.hasChanges) {
        await handleUpdatePlan({ incomes: syncResult.incomes });
      }
    } catch (error) {
      console.error('Failed to auto-sync imported income sources', error);
    } finally {
      autoSyncingRef.current = false;
    }
  }, [householdId, id, plan, handleUpdatePlan]);

  useEffect(() => {
    if (!plan?.autoUpdate) return;
    void syncAutoUpdatedImportedIncomes();
  }, [plan?.autoUpdate, syncAutoUpdatedImportedIncomes]);

  return {
    plan,
    loading: planLoading,
    error: planError,
    isEditingName,
    editedName,
    setEditedName,
    setIsEditingName,
    handleUpdatePlan,
    handleToggleAutoUpdate,
    handleRecalculate,
    handleDelete,
    handleSaveName,
    handleCancelEditName,
    importData,
  };
};
