import { orderBy } from 'firebase/firestore';
import { accountRepository } from '@/infra/repositories/accountRepository';
import { type Account } from '@/domains/account/types/account';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface GetAccountsRequest {
  householdId: string;
  auth: AuthContext;
}

export class GetAccountsUseCase {
  async execute(request: GetAccountsRequest): Promise<Account[]> {
    const { householdId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return await accountRepository.list(
      [householdId],
      [orderBy('order', 'asc'), orderBy('createdAt', 'desc')],
    );
  }
}

export const getAccountsUseCase = new GetAccountsUseCase();
