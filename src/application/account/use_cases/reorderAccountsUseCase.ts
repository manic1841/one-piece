import {
  type ReorderEntry,
  reorderCollectionInTransaction,
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

    if (accountOrders.length === 0) return;

    // Every row must be assigned. Order is global; renumbering a filtered list
    // collides with inactive rows that were not part of that list.
    const accounts = await accountRepository.getAccounts(householdId, true);
    const existingIds = new Set(accounts.map((account) => account.id));
    if (
      accountOrders.length !== existingIds.size ||
      accountOrders.some((entry) => !existingIds.has(entry.id))
    ) {
      throw new ReorderCommandError(
        ReorderCommandErrorCode.INVALID_ORDERS,
        'reorder requires the complete account list',
      );
    }

    await reorderCollectionInTransaction({
      getDocRef: (id) => accountRepository.getDocRefById(householdId, id),
      orders: accountOrders as ReorderEntry[],
      userEmail,
    });
  }
}

export const reorderAccountsUseCase = new ReorderAccountsUseCase();
