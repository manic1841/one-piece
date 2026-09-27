import type { RetirementExpenseCategory, RetirementPlan } from '@/domains/retirement/types';

interface MergeImportedExpensesRequest {
  plan: RetirementPlan;
  importedExpenses: RetirementExpenseCategory[];
}

interface MergeImportedExpensesResult {
  expenses: RetirementExpenseCategory[];
  hasChanges: boolean;
}

/**
 * Merges ledger-imported expense categories into the plan, aligning on
 * expenseCategory (the source ledger code). An existing category updates in
 * place keeping its id; a new one is appended.
 */
class MergeImportedExpensesUseCase {
  execute(request: MergeImportedExpensesRequest): MergeImportedExpensesResult {
    const { plan, importedExpenses } = request;

    if (importedExpenses.length === 0) {
      return { expenses: plan.expenses, hasChanges: false };
    }

    const merged = [...plan.expenses];
    let hasChanges = false;

    for (const importedExpense of importedExpenses) {
      if (!importedExpense.expenseCategory) {
        continue;
      }

      const matchIndex = merged.findIndex(
        (existing) => existing.expenseCategory === importedExpense.expenseCategory,
      );

      if (matchIndex >= 0) {
        const existing = merged[matchIndex];
        if (existing.currentAnnual === importedExpense.currentAnnual) {
          continue;
        }
        merged[matchIndex] = {
          ...existing,
          currentAnnual: importedExpense.currentAnnual,
          note: importedExpense.note,
        };
        hasChanges = true;
        continue;
      }

      merged.push(importedExpense);
      hasChanges = true;
    }

    return { expenses: merged, hasChanges };
  }
}

export const mergeImportedExpensesUseCase = new MergeImportedExpensesUseCase();
