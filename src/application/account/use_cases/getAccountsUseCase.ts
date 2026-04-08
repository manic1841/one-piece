import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type Account } from '@/domains/account/types/account';
import { accountRepository } from '@/infra/repositories/accountRepository';

export interface GetAccountsRequest {
  householdId: string;
  auth: AuthContext;
  includeInactive?: boolean;
}

export class GetAccountsUseCase {
  async execute(request: GetAccountsRequest): Promise<Account[]> {
    const { householdId, auth, includeInactive = false } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return await accountRepository.getAccounts(householdId, includeInactive);
  }
}

export const getAccountsUseCase = new GetAccountsUseCase();
