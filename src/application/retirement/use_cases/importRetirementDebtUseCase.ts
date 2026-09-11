import { startOfMonth, subMonths } from 'date-fns';

import { type AuthContext } from '@/application/types';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import {
  type RetirementExpenseCategory,
  RetirementExpenseType,
  SalaryPercentageRetirementMode,
} from '@/domains/retirement/types';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';

interface ImportRetirementDebtRequest {
  householdId: string;
  auth: AuthContext;
}

const toYearMonth = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// ADR-0032: scan last 12 months of DebtSnapshots per active account.
const DEBT_SNAPSHOT_WINDOW_MONTHS = 12;

export class ImportRetirementDebtUseCase {
  async execute(
    request: ImportRetirementDebtRequest,
  ): Promise<RetirementExpenseCategory[]> {
    const { householdId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const now = new Date();
    const windowStart = startOfMonth(subMonths(now, DEBT_SNAPSHOT_WINDOW_MONTHS));
    const startYearMonth = toYearMonth(windowStart);
    const endYearMonth = toYearMonth(now);

    const activeDebtAccounts = await debtAccountRepository.getDebtAccounts(householdId);

    // N+1 query pattern: one snapshot query per active debt account.
    // Firestore has no cross-subcollection join, so this is unavoidable
    // without migrating snapshots to a top-level collection. N is small
    // (household debt accounts are typically single-digit). Queries run
    // concurrently via Promise.all.
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

export const importRetirementDebtUseCase = new ImportRetirementDebtUseCase();
