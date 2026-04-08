import type { RetirementIncomeSource, RetirementPlan } from '@/domains/retirement/types';

interface MergeImportedIncomeSourcesRequest {
  plan: RetirementPlan;
  importedIncomes: RetirementIncomeSource[];
}

interface MergeImportedIncomeSourcesResult {
  incomes: RetirementIncomeSource[];
  hasChanges: boolean;
}

class MergeImportedIncomeSourcesUseCase {
  execute(request: MergeImportedIncomeSourcesRequest): MergeImportedIncomeSourcesResult {
    const { plan, importedIncomes } = request;

    if (importedIncomes.length === 0) {
      return { incomes: plan.incomes, hasChanges: false };
    }

    const merged = [...plan.incomes];

    for (const importedIncome of importedIncomes) {
      const matchIndex = merged.findIndex(
        (existing) =>
          existing.incomeCategory && existing.incomeCategory === importedIncome.incomeCategory,
      );

      if (matchIndex >= 0) {
        merged[matchIndex] = {
          ...merged[matchIndex],
          ...importedIncome,
          id: merged[matchIndex].id,
        };
        continue;
      }

      merged.push(importedIncome);
    }

    return { incomes: merged, hasChanges: true };
  }
}

export const mergeImportedIncomeSourcesUseCase = new MergeImportedIncomeSourcesUseCase();
