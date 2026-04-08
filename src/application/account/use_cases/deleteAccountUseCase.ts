import { accountRepository } from '@/infra/repositories/accountRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface DeleteAccountRequest {
  householdId: string;
  accountId: string;
  auth: AuthContext;
}

export class DeleteAccountUseCase {
  async execute(request: DeleteAccountRequest): Promise<void> {
    const { householdId, accountId, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return await accountRepository.delete([householdId, accountId]);
  }
}

export const deleteAccountUseCase = new DeleteAccountUseCase();
