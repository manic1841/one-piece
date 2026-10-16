import { alignBaselineImport } from '@/domains/retirement/logic/baselineImportAlignment';
import type { RetirementExpenseCategory, RetirementPlan } from '@/domains/retirement/types';

interface MergeImportedDebtRepaymentExpensesRequest {
  plan: RetirementPlan;
  importedExpenses: RetirementExpenseCategory[];
}

interface MergeImportedDebtRepaymentExpensesResult {
  expenses: RetirementExpenseCategory[];
  hasChanges: boolean;
  /** Existing sourced debt rows with no matching source in the import. */
  unmatchedCount: number;
}

/**
 * Aligns debt-repayment imports into the plan (spec #301 §4.3), aligning on
 * `sourceDebtAccountId`. The base amount and source statistics are overwritten,
 * and the end year follows the debt account (it is not one of the four
 * end-condition semantics). Other user assumptions, such as `growthRate`, are
 * preserved. Rows whose debt account disappeared are kept.
 */
class MergeImportedDebtRepaymentExpensesUseCase {
  execute(
    request: MergeImportedDebtRepaymentExpensesRequest,
  ): MergeImportedDebtRepaymentExpensesResult {
    const { plan, importedExpenses } = request;

    const { rows, hasChanges, unmatchedCount } = alignBaselineImport({
      existing: plan.expenses,
      imported: importedExpenses,
      sourceKey: (expense) => expense.sourceDebtAccountId,
      applyImport: (_existing, imported) => ({
        currentAnnual: imported.currentAnnual,
        ...(imported.calculatedFrom ? { calculatedFrom: imported.calculatedFrom } : {}),
        ...(imported.endYear !== undefined ? { endYear: imported.endYear } : {}),
      }),
    });

    return { expenses: rows, hasChanges, unmatchedCount };
  }
}

export const mergeImportedDebtRepaymentExpensesUseCase =
  new MergeImportedDebtRepaymentExpensesUseCase();
