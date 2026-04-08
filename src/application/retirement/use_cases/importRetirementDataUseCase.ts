import { startOfMonth, subMonths } from 'date-fns';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import {
  type PlannedIncome,
  calculateIncomeSourceSuggestions,
} from '@/domains/retirement/logic/retirementPlanLogic';
import {
  type RetirementExpenseCategory,
  RetirementExpenseType,
  type RetirementIncomeSource,
  SalaryPercentageRetirementMode,
} from '@/domains/retirement/types';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

interface ImportRetirementDataRequest {
  householdId: string;
  referenceMonths: number;
  type: 'transactions' | 'debtRepayments';
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

const toYearMonth = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export class ImportRetirementDataUseCase {
  async execute(
    request: ImportRetirementDataRequest,
  ): Promise<RetirementExpenseCategory[] | RetirementIncomeSource[]> {
    const { householdId, type, auth } = request;

    if (type === 'transactions') {
      return this.importFromTransactions(householdId, auth);
    }

    return this.importFromDebtRepayments(householdId, auth);
  }

  private async importFromTransactions(
    householdId: string,
    auth: { uid: string; isGlobalAdmin: boolean },
  ): Promise<RetirementIncomeSource[]> {
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const fixedWindowMonths = 12;
    const endDate = new Date();
    const startDate = startOfMonth(subMonths(endDate, fixedWindowMonths));

    const transactions = await transactionRepository.listByDateRange(
      householdId,
      startDate,
      endDate,
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

    return calculateIncomeSourceSuggestions(mappedIncomes, fixedWindowMonths);
  }

  private async importFromDebtRepayments(
    householdId: string,
    auth: { uid: string; isGlobalAdmin: boolean },
  ): Promise<RetirementExpenseCategory[]> {
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const now = new Date();
    const fixedWindowMonths = 12;
    const windowStart = startOfMonth(subMonths(now, fixedWindowMonths));
    const startYearMonth = toYearMonth(windowStart);
    const endYearMonth = toYearMonth(now);

    const activeDebtAccounts = await debtAccountRepository.getDebtAccounts(householdId);

    const importedExpenses = await Promise.all(
      activeDebtAccounts.map(async (account): Promise<RetirementExpenseCategory> => {
        const snapshots = await debtSnapshotRepository.listByYearMonthRange(
          householdId,
          account.id,
          startYearMonth,
          endYearMonth,
        );

        const interestPaid = snapshots.reduce((sum, snapshot) => sum + snapshot.interestPaid, 0);
        const totalPaid = snapshots.reduce((sum, snapshot) => sum + snapshot.totalPaid, 0);

        return {
          id: crypto.randomUUID(),
          name: `${account.name} 還款`,
          sourceDebtAccountId: account.id,
          type: RetirementExpenseType.DEBT_PAYMENT,
          includesPrincipal: true,
          interestOnly: false,
          calculatedFrom: {
            debtAccountId: account.id,
            sampleStartYearMonth: startYearMonth,
            sampleEndYearMonth: endYearMonth,
            totalPaid,
            interestPaid,
            sampleCount: snapshots.length,
            importedAt: new Date().toISOString(),
          },
          calculationMode: 'FIXED',
          salaryPercentageRetirementMode: SalaryPercentageRetirementMode.MANUAL_FALLBACK,
          baseAmount: Math.round(account.monthlyPayment * 12),
          growthRate: 0,
          retirementMultiplier: 1,
          startYear: account.startDate.getFullYear(),
          endYear: account.endDate.getFullYear(),
          note: `Debt repayment import (${startYearMonth}..${endYearMonth})`,
        };
      }),
    );

    return importedExpenses;
  }
}

export const importRetirementDataUseCase = new ImportRetirementDataUseCase();
