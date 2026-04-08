import {
  addDays,
  getInclusiveMonthCount,
  getShiftedWindow,
  isImportedIncomeSyncTarget,
  toIsoDate,
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
}

class SyncImportedIncomeSourcesUseCase {
  async execute(
    request: SyncImportedIncomeSourcesRequest,
  ): Promise<SyncImportedIncomeSourcesResult> {
    const { householdId, plan, today = new Date() } = request;

    if (!plan.autoUpdate) {
      return { incomes: plan.incomes, hasChanges: false };
    }

    let hasChanges = false;

    const incomes = await Promise.all(
      plan.incomes.map(async (income): Promise<RetirementIncomeSource> => {
        if (!isImportedIncomeSyncTarget(income)) {
          return income;
        }

        const shiftedWindow = getShiftedWindow(
          income.calculatedFrom.startDate,
          income.calculatedFrom.endDate,
          today,
        );

        if (!shiftedWindow) {
          return income;
        }

        const nextStartDateIso = toIsoDate(shiftedWindow.startDate);
        const nextEndDateIso = toIsoDate(shiftedWindow.endDate);

        if (
          income.calculatedFrom.startDate === nextStartDateIso &&
          income.calculatedFrom.endDate === nextEndDateIso
        ) {
          return income;
        }

        const transactions = await transactionRepository.listByDateRange(
          householdId,
          shiftedWindow.startDate,
          addDays(shiftedWindow.endDate, 1),
        );

        const totalAmount = transactions
          .flatMap((tx) => tx.entries)
          .filter((entry) => entry.ledgerCode === income.calculatedFrom.ledgerCode)
          .reduce((sum, entry) => sum + (entry.credit || 0) - (entry.debit || 0), 0);

        const sampleCount = getInclusiveMonthCount(shiftedWindow.startDate, shiftedWindow.endDate);
        const monthlyAverage = totalAmount / sampleCount;
        const nextBaseAmount = monthlyAverage * 12;

        hasChanges = true;
        return {
          ...income,
          baseAmount: nextBaseAmount,
          calculatedFrom: {
            ...income.calculatedFrom,
            startDate: nextStartDateIso,
            endDate: nextEndDateIso,
            totalAmount,
            monthlyAverage,
            sampleCount,
            importedAt: new Date().toISOString(),
          },
          note: `Auto-updated from ${nextStartDateIso} to ${nextEndDateIso}`,
        };
      }),
    );

    return { incomes, hasChanges };
  }
}

export const syncImportedIncomeSourcesUseCase = new SyncImportedIncomeSourcesUseCase();
