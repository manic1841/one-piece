import { useCallback, useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { type RetirementPlan, type RetirementPlanCreate } from '@/domains/retirement/types';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';
import { useRetirementPlans } from '@/ui/features/retirement/hooks/useRetirementPlans';
import { mapRetirementPlanToListItemVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

export const useRetirementPlanListPage = (householdId?: string, email?: string) => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<RetirementPlan[]>([]);
  const { listPlans, loading, error } = useRetirementPlans(householdId);
  const { createPlan, deletePlan, duplicatePlan } = useRetirementPlanCmds(householdId, email);

  const fetchPlans = useCallback(async () => {
    const data = await listPlans();
    setPlans(data || []);
  }, [listPlans]);

  useEffect(() => {
    const init = async () => {
      await fetchPlans();
    };
    init();
  }, [fetchPlans]);

  const handleCreatePlan = async () => {
    if (!householdId || !email) return;

    // Create a default plan
    const newPlan: RetirementPlanCreate = {
      name: `New Plan ${new Date().toLocaleDateString()}`,
      isActive: true,
      autoUpdate: false,
      currentYear: new Date().getFullYear(),
      birthYear: new Date().getFullYear() - 30, // Default age 30
      retirementAge: 60,
      lifeExpectancy: 85,
      currentSavings: 0,
      salaryGrowthRate: 3,
      inflationRate: 2,
      investmentReturnRate: 5,
      incomes: [],
      expenses: [],
      events: [],
    };

    try {
      const id = await createPlan(newPlan);
      if (id) {
        navigate(`/retirement/${id}`);
      }
    } catch (err) {
      console.error('Failed to create plan', err);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      await deletePlan(id);
      await fetchPlans();
    } catch (err) {
      console.error('Failed to delete plan', err);
    }
  };

  const handleDuplicatePlan = async (id: string) => {
    if (!householdId || !email) return;
    try {
      const duplicatedId = await duplicatePlan(id);
      if (duplicatedId) {
        navigate(`/retirement/${duplicatedId}`);
      }
      await fetchPlans();
    } catch (err) {
      console.error('Failed to duplicate plan', err);
    }
  };

  return {
    plans,
    planItems: plans.map(mapRetirementPlanToListItemVM),
    listPlans, // This will be used as the data source (async fetch)
    loading,
    error,
    createPlan: handleCreatePlan,
    deletePlan: handleDeletePlan,
    duplicatePlan: handleDuplicatePlan,
    reload: fetchPlans,
  };
};
