import type { RetirementExpenseCategory, RetirementPlan } from '@/domains/retirement/types';

interface MergeImportedDebtRepaymentExpensesRequest {
  plan: RetirementPlan;
  importedExpenses: RetirementExpenseCategory[];
}

interface MergeImportedDebtRepaymentExpensesResult {
  expenses: RetirementExpenseCategory[];
  hasChanges: boolean;
}

class MergeImportedDebtRepaymentExpensesUseCase {
  execute(
    request: MergeImportedDebtRepaymentExpensesRequest,
  ): MergeImportedDebtRepaymentExpensesResult {
    const { plan, importedExpenses } = request;

    if (importedExpenses.length === 0) {
      return { expenses: plan.expenses, hasChanges: false };
    }

    const merged = [...plan.expenses];

    for (const importedExpense of importedExpenses) {
      const matchIndex = merged.findIndex(
        (existing) =>
          existing.sourceDebtAccountId &&
          existing.sourceDebtAccountId === importedExpense.sourceDebtAccountId,
      );

      if (matchIndex >= 0) {
        merged[matchIndex] = {
          ...merged[matchIndex],
          ...importedExpense,
          id: merged[matchIndex].id,
        };
        continue;
      }

      merged.push(importedExpense);
    }

    return { expenses: merged, hasChanges: true };
  }
}

export const mergeImportedDebtRepaymentExpensesUseCase =
  new MergeImportedDebtRepaymentExpensesUseCase();
