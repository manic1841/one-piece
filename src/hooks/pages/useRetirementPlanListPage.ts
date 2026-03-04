import { useNavigate } from 'react-router-dom';

import { type RetirementPlanCreate } from '@/domains/retirement/types';

import { useRetirementPlanCmds } from '../useRetirementPlanCmds';
import { useRetirementPlans } from '../useRetirementPlans';

export const useRetirementPlanListPage = (householdId?: string, email?: string) => {
  const navigate = useNavigate();
  const { plans, loading, error, reload } = useRetirementPlans(householdId);
  const { createPlan, deletePlan } = useRetirementPlanCmds(householdId, email);

  const handleCreatePlan = async () => {
    if (!householdId || !email) return;

    // Create a default plan
    const newPlan: RetirementPlanCreate = {
      name: `New Plan ${new Date().toLocaleDateString()}`,
      isActive: true,
      currentYear: new Date().getFullYear(),
      currentAge: 30, // Default
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
      reload();
    } catch (err) {
      console.error('Failed to delete plan', err);
    }
  };

  return {
    plans,
    loading,
    error,
    createPlan: handleCreatePlan,
    deletePlan: handleDeletePlan,
    reload,
  };
};
