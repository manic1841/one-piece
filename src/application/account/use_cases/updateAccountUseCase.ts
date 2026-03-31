import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type AccountCreate } from '@/domains/account/types/account';
import { accountRepository } from '@/infra/repositories/accountRepository';

export interface UpdateAccountRequest {
  householdId: string;
  accountId: string;
  updates: Partial<AccountCreate>;
  userEmail: string;
  auth: AuthContext;
}

export class UpdateAccountUseCase {
  async execute(request: UpdateAccountRequest): Promise<void> {
    const { householdId, accountId, updates, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return await accountRepository.updateAccount(householdId, accountId, updates, userEmail);
  }
}

export const updateAccountUseCase = new UpdateAccountUseCase();
