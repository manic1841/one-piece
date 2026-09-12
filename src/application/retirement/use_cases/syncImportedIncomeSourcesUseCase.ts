import {
  getFullYearWindow,
  getLastFullYear,
  isImportedIncomeSyncTarget,
} from '@/domains/retirement/logic/importedIncomeAutoUpdate';
import type { RetirementIncomeSource, RetirementPlan } from '@/domains/retirement/types';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

interface SyncImportedIncomeSourcesRequest {
  householdId: string;
  plan: RetirementPlan;
  today?: Date;
}

interface SyncImportedIncomeSourcesResult {
  incomes: RetirementIncomeSource[];
  hasChanges: boolean;
  staleCount: number;
  targetSampleYear: number;
}

class SyncImportedIncomeSourcesUseCase {
  async execute(
    request: SyncImportedIncomeSourcesRequest,
  ): Promise<SyncImportedIncomeSourcesResult> {
    const { householdId, plan, today = new Date() } = request;
    const targetSampleYear = getLastFullYear(today);

    if (!plan.autoUpdate) {
      return {
        incomes: plan.incomes,
        hasChanges: false,
        staleCount: 0,
        targetSampleYear,
      };
    }

    let hasChanges = false;
    let staleCount = 0;

    const incomes = await Promise.all(
      plan.incomes.map(async (income): Promise<RetirementIncomeSource> => {
        if (!isImportedIncomeSyncTarget(income)) {
          return income;
        }

        if (income.calculatedFrom.sampleYear >= targetSampleYear) {
          return income;
        }
        staleCount += 1;

        const window = getFullYearWindow(targetSampleYear);

        const transactions = await transactionRepository.listByDateRange(
          householdId,
          window.startDate,
          window.endDateExclusive,
        );

        const totalAmount = transactions
          .flatMap((tx) => tx.entries)
          .filter((entry) => entry.ledgerCode === income.calculatedFrom.ledgerCode)
          .reduce((sum, entry) => sum + (entry.credit || 0) - (entry.debit || 0), 0);

        const monthlyAverage = totalAmount / 12;
        const nextBaseAmount = totalAmount > 0 ? totalAmount : income.baseAmount;

        hasChanges = true;
        return {
          ...income,
          baseAmount: nextBaseAmount,
          calculatedFrom: {
            ...income.calculatedFrom,
            sampleYear: targetSampleYear,
            totalAmount,
            monthlyAverage,
            sampleCount: transactions.length,
            importedAt: new Date().toISOString(),
          },
          note:
            totalAmount > 0
              ? `Auto-updated using ${targetSampleYear} full-year transactions`
              : `No ${targetSampleYear} transaction sample found; kept previous base amount`,
        };
      }),
    );

    return { incomes, hasChanges, staleCount, targetSampleYear };
  }
}

export const syncImportedIncomeSourcesUseCase = new SyncImportedIncomeSourcesUseCase();
