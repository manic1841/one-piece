import { withReadPermission } from '@/application/common/readGuard';
import { type AuthContext } from '@/application/types';
import { type Account } from '@/domains/account/types/account';
import { accountRepository } from '@/infra/repositories/accountRepository';

export interface GetAccountRequest {
  householdId: string;
  accountId: string;
  auth: AuthContext;
  skipPermissionCheck?: boolean;
}

export class GetAccountUseCase {
  async execute(request: GetAccountRequest): Promise<Account | null> {
    const { householdId, accountId, auth, skipPermissionCheck = false } = request;

    return withReadPermission(
      householdId,
      auth,
      () => accountRepository.get([householdId, accountId]),
      { skipPermissionCheck },
    );
  }
}

export const getAccountUseCase = new GetAccountUseCase();
