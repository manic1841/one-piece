import { useCallback, useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { type RetirementPlan, type RetirementPlanCreate } from '@/domains/retirement/types';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';
import { useRetirementPlans } from '@/ui/features/retirement/hooks/useRetirementPlans';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import { mapRetirementPlanToListItemVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

export const useRetirementPlanListPage = (householdId?: string, email?: string) => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<RetirementPlan[]>([]);
  const [mutating, setMutating] = useState(false);
  const { listPlans, loading, error } = useRetirementPlans(householdId);
  const { createPlan, deletePlan, duplicatePlan } = useRetirementPlanCmds(householdId, email);
  const { confirm } = useConfirm();

  const fetchPlans = useCallback(async () => {
    const result = await listPlans();
    setPlans(result.ok ? result.value : []);
  }, [listPlans]);

  useEffect(() => {
    const init = async () => {
      await fetchPlans();
    };
    init();
  }, [fetchPlans]);

  const handleCreatePlan = async () => {
    if (!householdId || !email || mutating) return;

    // Create a default plan
    const newPlan: RetirementPlanCreate = {
      name: `New Plan ${new Date().toLocaleDateString()}`,
      isActive: true,
      autoUpdate: false,
      currentYear: new Date().getFullYear(),
      birthYear: new Date().getFullYear() - 30, // Default age 30
      retirementAge: 60,
      lifeExpectancy: 85,
      inflationRate: 2,
      investmentReturnRate: 5,
      incomes: [],
      expenses: [],
      events: [],
    };

    try {
      setMutating(true);
      const created = await createPlan(newPlan);
      if (created.ok) {
        navigate(`/retirement/${created.value}`);
      }
    } catch (err) {
      console.error('Failed to create plan', err);
    } finally {
      setMutating(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    const confirmed = await confirm('Are you sure you want to delete this plan?');
    if (!confirmed) return;
    try {
      await deletePlan(id);
      await fetchPlans();
    } catch (err) {
      console.error('Failed to delete plan', err);
    }
  };

  const handleDuplicatePlan = async (id: string) => {
    if (!householdId || !email || mutating) return;
    try {
      setMutating(true);
      const duplicated = await duplicatePlan(id);
      if (duplicated.ok) {
        navigate(`/retirement/${duplicated.value}`);
      }
      await fetchPlans();
    } catch (err) {
      console.error('Failed to duplicate plan', err);
    } finally {
      setMutating(false);
    }
  };

  return {
    plans,
    planItems: plans.map(mapRetirementPlanToListItemVM),
    listPlans, // This will be used as the data source (async fetch)
    loading,
    error,
    mutating,
    createPlan: handleCreatePlan,
    deletePlan: handleDeletePlan,
    duplicatePlan: handleDuplicatePlan,
    reload: fetchPlans,
  };
};
