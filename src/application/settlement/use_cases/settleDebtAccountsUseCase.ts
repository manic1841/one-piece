import { type DebtSnapshotCreate } from '@/domains/debt/schemas';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';

export interface SettleDebtAccountsRequest {
  householdId: string;
  yearMonth: string;
  userEmail: string;
}

export class SettleDebtAccountsUseCase {
  async execute(request: SettleDebtAccountsRequest): Promise<void> {
    const { householdId, yearMonth, userEmail } = request;
    const debtAccounts = await debtAccountRepository.getDebtAccounts(householdId);

    for (const account of debtAccounts) {
      const existing = await debtSnapshotRepository.getSnapshot(householdId, account.id, yearMonth);
      if (existing) continue;

      const snapshot: DebtSnapshotCreate = {
        yearMonth,
        openingBalance: account.currentBalance,
        principalPaid: 0,
        interestPaid: 0,
        totalPaid: 0,
        closingBalance: account.currentBalance,
      };

      await debtSnapshotRepository.upsertSnapshot(householdId, account.id, snapshot, userEmail);
    }
  }
}

export const settleDebtAccountsUseCase = new SettleDebtAccountsUseCase();
