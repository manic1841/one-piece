import { accountRepository } from '@/infra/repositories/accountRepository';
import { type Account } from '@/domains/account/types/account';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface GetAccountRequest {
  householdId: string;
  accountId: string;
  auth: AuthContext;
}

export class GetAccountUseCase {
  async execute(request: GetAccountRequest): Promise<Account | null> {
    const { householdId, accountId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return await accountRepository.get([householdId, accountId]);
  }
}

export const getAccountUseCase = new GetAccountUseCase();
