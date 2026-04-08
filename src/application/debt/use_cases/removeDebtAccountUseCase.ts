import { runTransaction } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { db } from '@/firebase';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
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
 *   - Has LIABILITY_PAYMENT transactions → soft delete (isActive: false)
 *   - No payments → hard delete
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

    if (hasPayments) {
      await debtAccountRepository.deactivateDebtAccount(householdId, debtAccountId, userEmail);
      return { strategy: 'deactivated' };
    } else {
      const borrowTransactions = await transactionRepository.findBorrowTransactionsForDebtAccount(
        householdId,
        debtAccount,
      );

      await runTransaction(db, async (tx) => {
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
