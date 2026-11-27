import { withReadPermission } from '@/application/common/readGuard';
import { type AuthContext } from '@/application/types';
import { type Account } from '@/domains/account/types/account';
import { accountRepository } from '@/infra/repositories/accountRepository';

export interface GetAccountsRequest {
  householdId: string;
  auth: AuthContext;
  includeInactive?: boolean;
  skipPermissionCheck?: boolean;
}

export class GetAccountsUseCase {
  async execute(request: GetAccountsRequest): Promise<Account[]> {
    const { householdId, auth, includeInactive = false, skipPermissionCheck = false } = request;

    return withReadPermission(
      householdId,
      auth,
      () => accountRepository.getAccounts(householdId, includeInactive),
      { skipPermissionCheck },
    );
  }
}

export const getAccountsUseCase = new GetAccountsUseCase();
