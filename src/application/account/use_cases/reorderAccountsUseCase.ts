import {
  reorderCollectionInTransaction,
  type ReorderEntry,
} from '@/application/common/reorderCollectionInTransaction';
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

    await reorderCollectionInTransaction({
      getDocRef: (id) => accountRepository.getDocRefById(householdId, id),
      orders: accountOrders as ReorderEntry[],
      userEmail,
    });
  }
}

export const reorderAccountsUseCase = new ReorderAccountsUseCase();
