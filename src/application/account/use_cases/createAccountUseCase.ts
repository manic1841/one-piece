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

    // The full list owns the append rule. A controller's filtered rows cannot
    // safely derive this value when inactive accounts have not been fetched.
    const accounts = await accountRepository.getAccounts(householdId, true);
    const order = data.order ?? accounts.reduce((max, a) => Math.max(max, a.order ?? 0), -1) + 1;

    const accountId = await accountRepository.createAccount(
      householdId,
      { ...data, order },
      userEmail,
    );

    return accountId;
  }
}

export const createAccountUseCase = new CreateAccountUseCase();
