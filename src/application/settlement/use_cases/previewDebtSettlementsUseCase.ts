import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface PreviewDebtSettlementsRequest {
  householdId: string;
  year: number;
  month: number;
}

export interface DebtSettlementPreviewItem {
  debtAccountId: string;
  debtAccountName: string;
  openingBalance: number;
  hasRepaymentRecord: boolean;
  repaymentCount: number;
  repaymentAmount: number;
  hasSnapshot: boolean;
  willCreateSnapshot: boolean;
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
    const { householdId, year, month } = request;
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
        const stats = repaymentStats.get(account.id) || { count: 0, amount: 0 };
        const hasRepaymentRecord = stats.count > 0;

        return {
          debtAccountId: account.id,
          debtAccountName: account.name,
          openingBalance: account.currentBalance,
          hasRepaymentRecord,
          repaymentCount: stats.count,
          repaymentAmount: stats.amount,
          hasSnapshot: snapshot !== null,
          willCreateSnapshot: snapshot === null,
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
