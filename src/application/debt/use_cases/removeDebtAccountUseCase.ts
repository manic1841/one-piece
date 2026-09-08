import { runTransaction } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { db } from '@/firebase';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface RemoveDebtAccountRequest {
  householdId: string;
  debtAccountId: string;
  userEmail: string;
  auth: AuthContext;
}

export interface RemoveDebtAccountResult {
  strategy: 'deactivated' | 'deleted';
}

/**
 * Smart delete:
 *   - Has DEBT_PAYMENT history (or legacy LIABILITY_PAYMENT) or snapshots → soft delete
 *   - No payments and no snapshots → hard delete
 *
 * The hard-delete transaction re-reads the account and compares updatedAt so a
 * DEBT_PAYMENT committed between detection and deletion aborts the delete; any
 * payment touches the account document (ADR-0038), so contention is guaranteed
 * to be observed. Firestore then retries or surfaces the conflict to the caller.
 */
export class RemoveDebtAccountUseCase {
  async execute(request: RemoveDebtAccountRequest): Promise<RemoveDebtAccountResult> {
    const { householdId, debtAccountId, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const debtAccount = await debtAccountRepository.get([householdId, debtAccountId]);
    if (!debtAccount) {
      throw new Error(`DebtAccount ${debtAccountId} not found`);
    }

    const hasPayments = await debtAccountRepository.checkHasPayments(householdId, debtAccountId);
    const hasSnapshots = hasPayments
      ? false
      : await debtSnapshotRepository.hasSnapshots(householdId, debtAccountId);

    if (hasPayments || hasSnapshots) {
      await debtAccountRepository.deactivateDebtAccount(householdId, debtAccountId, userEmail);
      return { strategy: 'deactivated' };
    } else {
      const borrowTransactions = await transactionRepository.findBorrowTransactionsForDebtAccount(
        householdId,
        debtAccount,
      );

      await runTransaction(db, async (tx) => {
        const currentAccount = await debtAccountRepository.get([householdId, debtAccountId], tx);
        if (!currentAccount) {
          throw new Error(`DebtAccount ${debtAccountId} not found`);
        }
        if (currentAccount.updatedAt.getTime() !== debtAccount.updatedAt.getTime()) {
          throw new Error(
            `DebtAccount ${debtAccountId} changed during removal (concurrent update); retry`,
          );
        }

        for (const borrowTransaction of borrowTransactions) {
          await transactionRepository.delete([householdId, borrowTransaction.id], tx);
        }
        await debtAccountRepository.deleteDebtAccount(householdId, debtAccountId, tx);
      });

      return { strategy: 'deleted' };
    }
  }
}

export const removeDebtAccountUseCase = new RemoveDebtAccountUseCase();
