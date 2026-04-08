import { accountRepository } from '@/infra/repositories/accountRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

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

    const updatePromises = accountOrders.map(({ id, order }) =>
      accountRepository.update([householdId, id], { order }, userEmail),
    );

    await Promise.all(updatePromises);
  }
}

export const reorderAccountsUseCase = new ReorderAccountsUseCase();
