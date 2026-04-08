import type { RetirementExpenseCategory, RetirementPlan } from '@/domains/retirement/types';

interface AddRetirementExpenseRequest {
  plan: RetirementPlan;
  expenseData: Omit<RetirementExpenseCategory, 'id'>;
  id: string;
}

interface UpdateRetirementExpenseRequest {
  plan: RetirementPlan;
  expenseId: string;
  updates: Omit<RetirementExpenseCategory, 'id'>;
}

interface RemoveRetirementExpenseRequest {
  plan: RetirementPlan;
  expenseId: string;
}

class ManageRetirementExpensesUseCase {
  add(request: AddRetirementExpenseRequest): RetirementExpenseCategory[] {
    const { plan, expenseData, id } = request;
    return [...plan.expenses, { ...expenseData, id }];
  }

  update(request: UpdateRetirementExpenseRequest): RetirementExpenseCategory[] {
    const { plan, expenseId, updates } = request;
    return plan.expenses.map((expense) =>
      expense.id === expenseId ? { ...expense, ...updates, id: expense.id } : expense,
    );
  }

  remove(request: RemoveRetirementExpenseRequest): RetirementExpenseCategory[] {
    const { plan, expenseId } = request;
    return plan.expenses.filter((expense) => expense.id !== expenseId);
  }
}

export const manageRetirementExpensesUseCase = new ManageRetirementExpensesUseCase();
