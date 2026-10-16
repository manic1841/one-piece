import { alignBaselineImport } from '@/domains/retirement/logic/baselineImportAlignment';
import type { RetirementIncomeSource, RetirementPlan } from '@/domains/retirement/types';

interface MergeImportedIncomeSourcesRequest {
  plan: RetirementPlan;
  importedIncomes: RetirementIncomeSource[];
}

interface MergeImportedIncomeSourcesResult {
  incomes: RetirementIncomeSource[];
  hasChanges: boolean;
  /** Existing sourced incomes with no matching source in the import. */
  unmatchedCount: number;
}

/** Align on the merge key: `incomeCategory`, falling back to the raw ledger code. */
const incomeSourceKey = (income: RetirementIncomeSource): string | undefined =>
  income.incomeCategory ?? income.calculatedFrom?.ledgerCode;

/**
 * Aligns ledger-imported incomes into the plan (spec #301 §4.3): keep the
 * existing id, overwrite only the base amount and source statistics, append
 * missing sources, keep rows whose source disappeared.
 */
class MergeImportedIncomeSourcesUseCase {
  execute(request: MergeImportedIncomeSourcesRequest): MergeImportedIncomeSourcesResult {
    const { plan, importedIncomes } = request;

    const { rows, hasChanges, unmatchedCount } = alignBaselineImport({
      existing: plan.incomes,
      imported: importedIncomes,
      sourceKey: incomeSourceKey,
      applyImport: (_existing, imported) => ({
        currentAnnual: imported.currentAnnual,
        ...(imported.calculatedFrom ? { calculatedFrom: imported.calculatedFrom } : {}),
      }),
    });

    return { incomes: rows, hasChanges, unmatchedCount };
  }
}

export const mergeImportedIncomeSourcesUseCase = new MergeImportedIncomeSourcesUseCase();
