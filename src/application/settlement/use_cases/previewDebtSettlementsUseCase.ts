import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface PreviewDebtSettlementsRequest {
  householdId: string;
  year: number;
  month: number;
  auth: AuthContext;
}

export interface DebtSettlementPreviewItem {
  debtAccountId: string;
  debtAccountName: string;
  /** Balance the month's payment books against. Order (spec 195): the
   * current snapshot's frozen opening balance, then the previous snapshot's
   * closing balance, then the account's current balance. */
  openingBalance: number;
  hasRepaymentRecord: boolean;
  repaymentCount: number;
  repaymentAmount: number;
  hasSnapshot: boolean;
  willCreateSnapshot: boolean;
  /** Frozen snapshot values, present only when a snapshot already exists. */
  snapshotValues?: {
    openingBalance: number;
    principalPaid: number;
    interestPaid: number;
    totalPaid: number;
    closingBalance: number;
  };
}

export interface PreviewDebtSettlementsResult {
  year: number;
  month: number;
  yearMonth: string;
  items: DebtSettlementPreviewItem[];
  hasMissingRepayments: boolean;
  missingRepaymentAccountNames: string[];
}

export class PreviewDebtSettlementsUseCase {
  async execute(request: PreviewDebtSettlementsRequest): Promise<PreviewDebtSettlementsResult> {
    const { householdId, year, month, auth } = request;
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const debtAccounts = await debtAccountRepository.getDebtAccounts(householdId);
    const debtPayments = await transactionRepository.listDebtPaymentsByDateRange(
      householdId,
      startDate,
      endDate,
    );

    const repaymentStats = new Map<string, { count: number; amount: number }>();
    for (const payment of debtPayments) {
      if (!payment.debtAccountId) continue;

      const current = repaymentStats.get(payment.debtAccountId) || { count: 0, amount: 0 };
      repaymentStats.set(payment.debtAccountId, {
        count: current.count + 1,
        amount: current.amount + (payment.amount || 0),
      });
    }

    const items: DebtSettlementPreviewItem[] = await Promise.all(
      debtAccounts.map(async (account) => {
        const snapshot = await debtSnapshotRepository.getSnapshot(
          householdId,
          account.id,
          yearMonth,
        );
        const previousSnapshot = snapshot
          ? null
          : await debtSnapshotRepository.getSnapshot(
              householdId,
              account.id,
              getPrevYearMonth(yearMonth),
            );
        const stats = repaymentStats.get(account.id) || { count: 0, amount: 0 };
        const hasRepaymentRecord = stats.count > 0;

        return {
          debtAccountId: account.id,
          debtAccountName: account.name,
          openingBalance:
            snapshot?.openingBalance ?? previousSnapshot?.closingBalance ?? account.currentBalance,
          hasRepaymentRecord,
          repaymentCount: stats.count,
          repaymentAmount: stats.amount,
          hasSnapshot: snapshot !== null,
          willCreateSnapshot: snapshot === null,
          snapshotValues: snapshot
            ? {
                openingBalance: snapshot.openingBalance,
                principalPaid: snapshot.principalPaid,
                interestPaid: snapshot.interestPaid,
                totalPaid: snapshot.totalPaid,
                closingBalance: snapshot.closingBalance,
              }
            : undefined,
        };
      }),
    );

    const missingRepaymentAccountNames = items
      .filter((item) => !item.hasRepaymentRecord)
      .map((item) => item.debtAccountName);

    return {
      year,
      month,
      yearMonth,
      items,
      hasMissingRepayments: missingRepaymentAccountNames.length > 0,
      missingRepaymentAccountNames,
    };
  }
}

export const previewDebtSettlementsUseCase = new PreviewDebtSettlementsUseCase();

function getPrevYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
