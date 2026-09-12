import { type AuthContext } from '@/application/types';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import {
  type PlannedIncome,
  calculateIncomeSourceSuggestions,
} from '@/domains/retirement/logic/retirementPlanLogic';
import type { RetirementIncomeSource } from '@/domains/retirement/types';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

interface ImportRetirementIncomeRequest {
  householdId: string;
  auth: AuthContext;
}

export class ImportRetirementIncomeUseCase {
  async execute(
    request: ImportRetirementIncomeRequest,
  ): Promise<RetirementIncomeSource[]> {
    const { householdId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const now = new Date();
    const lastFullYear = now.getFullYear() - 1;
    const startDate = new Date(lastFullYear, 0, 1);
    const endDateExclusive = new Date(lastFullYear + 1, 0, 1);

    const transactions = await transactionRepository.listByDateRange(
      householdId,
      startDate,
      endDateExclusive,
    );

    const mappedIncomes: PlannedIncome[] = transactions.flatMap((transaction) =>
      transaction.entries
        .filter((entry) => entry.ledgerCode.startsWith('income:'))
        .map((entry) => ({
          ledgerCode: entry.ledgerCode,
          amount: (entry.credit || 0) - (entry.debit || 0),
          date: transaction.date,
        })),
    );

    return calculateIncomeSourceSuggestions(mappedIncomes, lastFullYear);
  }
}

export const importRetirementIncomeUseCase = new ImportRetirementIncomeUseCase();
