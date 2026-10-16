import { alignBaselineImport } from '@/domains/retirement/logic/baselineImportAlignment';
import type { RetirementExpenseCategory, RetirementPlan } from '@/domains/retirement/types';

interface MergeImportedExpensesRequest {
  plan: RetirementPlan;
  importedExpenses: RetirementExpenseCategory[];
}

interface MergeImportedExpensesResult {
  expenses: RetirementExpenseCategory[];
  hasChanges: boolean;
  /** Existing sourced expenses with no matching source in the import. */
  unmatchedCount: number;
}

/**
 * Aligns ledger-imported expense categories into the plan (spec #301 §4.3),
 * aligning on `expenseCategory` (the source ledger code). An existing category
 * keeps its id and only its base amount and source statistics are overwritten;
 * user assumptions (growth rate, end condition, post-retirement multiplier)
 * are preserved. Rows whose source disappeared are kept.
 */
class MergeImportedExpensesUseCase {
  execute(request: MergeImportedExpensesRequest): MergeImportedExpensesResult {
    const { plan, importedExpenses } = request;

    const { rows, hasChanges, unmatchedCount } = alignBaselineImport({
      existing: plan.expenses,
      imported: importedExpenses,
      sourceKey: (expense) => expense.expenseCategory,
      applyImport: (_existing, imported) => ({
        currentAnnual: imported.currentAnnual,
        ...(imported.calculatedFrom ? { calculatedFrom: imported.calculatedFrom } : {}),
      }),
    });

    return { expenses: rows, hasChanges, unmatchedCount };
  }
}

export const mergeImportedExpensesUseCase = new MergeImportedExpensesUseCase();
