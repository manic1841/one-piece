import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type AccountCreate } from '@/domains/account/types/account';
import { accountRepository } from '@/infra/repositories/accountRepository';

export interface CreateAccountRequest {
  householdId: string;
  data: AccountCreate;
  userEmail: string;
  auth: AuthContext;
}

export class CreateAccountUseCase {
  async execute(request: CreateAccountRequest): Promise<string> {
    const { householdId, data, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const accountId = await accountRepository.createAccount(householdId, data, userEmail);

    return accountId;
  }
}

export const createAccountUseCase = new CreateAccountUseCase();
