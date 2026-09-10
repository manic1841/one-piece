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

      // No snapshot exists — create directly with deterministic ID.
      // upsertSnapshot would re-read the same document we just checked.
      const snapshot: DebtSnapshotCreate = {
        yearMonth,
        openingBalance: account.currentBalance,
        principalPaid: 0,
        interestPaid: 0,
        totalPaid: 0,
        closingBalance: account.currentBalance,
      };

      await debtSnapshotRepository.create(
        [householdId, account.id],
        snapshot,
        userEmail,
        undefined,
        yearMonth,
      );
    }
  }
}

export const settleDebtAccountsUseCase = new SettleDebtAccountsUseCase();
