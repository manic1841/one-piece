import { type AuthContext } from '@/application/types';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { groupExpenseSuggestions } from '@/domains/retirement/logic/expenseImportLogic';
import type { RetirementExpenseCategory } from '@/domains/retirement/types';
import { LEDGER_PREFIX } from '@/domains/ledger/constants/ledgerCodes';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

interface ImportRetirementExpensesRequest {
  householdId: string;
  auth: AuthContext;
}

export class ImportRetirementExpensesUseCase {
  async execute(
    request: ImportRetirementExpensesRequest,
  ): Promise<RetirementExpenseCategory[]> {
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

    const plannedExpenses = transactions.flatMap((transaction) =>
      transaction.entries
        .filter((entry) => entry.ledgerCode.startsWith(`${LEDGER_PREFIX.EXPENSE}:`))
        .map((entry) => ({
          ledgerCode: entry.ledgerCode,
          amount: (entry.debit || 0) - (entry.credit || 0),
        })),
    );

    return groupExpenseSuggestions(plannedExpenses, lastFullYear, now.getFullYear());
  }
}

export const importRetirementExpensesUseCase = new ImportRetirementExpensesUseCase();
