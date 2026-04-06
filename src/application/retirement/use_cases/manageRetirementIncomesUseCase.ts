import type { RetirementIncomeSource, RetirementPlan } from '@/domains/retirement/types';

interface AddRetirementIncomeRequest {
  plan: RetirementPlan;
  incomeData: Omit<RetirementIncomeSource, 'id'>;
  id: string;
}

interface UpdateRetirementIncomeRequest {
  plan: RetirementPlan;
  incomeId: string;
  updates: Omit<RetirementIncomeSource, 'id'>;
}

interface RemoveRetirementIncomeRequest {
  plan: RetirementPlan;
  incomeId: string;
}

class ManageRetirementIncomesUseCase {
  add(request: AddRetirementIncomeRequest): RetirementIncomeSource[] {
    const { plan, incomeData, id } = request;
    return [...plan.incomes, { ...incomeData, id }];
  }

  update(request: UpdateRetirementIncomeRequest): RetirementIncomeSource[] {
    const { plan, incomeId, updates } = request;
    return plan.incomes.map((income) =>
      income.id === incomeId ? { ...updates, id: income.id } : income,
    );
  }

  remove(request: RemoveRetirementIncomeRequest): RetirementIncomeSource[] {
    const { plan, incomeId } = request;
    return plan.incomes.filter((income) => income.id !== incomeId);
  }
}

export const manageRetirementIncomesUseCase = new ManageRetirementIncomesUseCase();
