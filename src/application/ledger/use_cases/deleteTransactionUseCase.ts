import { runTransaction } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { db } from '@/firebase';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface DeleteTransactionRequest {
  householdId: string;
  transactionId: string;
  auth: AuthContext;
}

export class DeleteTransactionUseCase {
  async execute(request: DeleteTransactionRequest): Promise<void> {
    const { householdId, transactionId, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    await runTransaction(db, async (tx) => {
      const transaction = await transactionRepository.get([householdId, transactionId], tx);
      if (!transaction) return;

      if (transaction.allocationId) {
        await allocationRepository.delete([householdId, transaction.allocationId], tx);
      }

      await transactionRepository.delete([householdId, transactionId], tx);
    });
  }
}

export const deleteTransactionUseCase = new DeleteTransactionUseCase();
