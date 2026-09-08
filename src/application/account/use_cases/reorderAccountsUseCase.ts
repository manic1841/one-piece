import {
  reorderCollectionInTransaction,
  type ReorderEntry,
} from '@/application/common/reorderCollectionInTransaction';
import { ReorderCommandError, ReorderCommandErrorCode } from '@/application/common/reorderErrors';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { accountRepository } from '@/infra/repositories/accountRepository';

export interface ReorderAccountsRequest {
  householdId: string;
  accountOrders: Array<{ id: string; order: number }>;
  userEmail: string;
  auth: AuthContext;
}

export class ReorderAccountsUseCase {
  async execute(request: ReorderAccountsRequest): Promise<void> {
    const { householdId, accountOrders, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    try {
      await reorderCollectionInTransaction({
        getDocRef: (id) => accountRepository.getDocRefById(householdId, id),
        orders: accountOrders as ReorderEntry[],
        userEmail,
      });
    } catch (error: unknown) {
      if (error instanceof ReorderCommandError) throw error;

      const message = error instanceof Error ? error.message : 'unknown transaction failure';
      throw new ReorderCommandError(ReorderCommandErrorCode.TRANSACTION_FAILED, message);
    }
  }
}

export const reorderAccountsUseCase = new ReorderAccountsUseCase();
