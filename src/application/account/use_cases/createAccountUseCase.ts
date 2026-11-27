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

    // The full list owns the append rule and nothing else sets `order` at this
    // seam: a controller's filtered rows cannot derive it while inactive
    // accounts are unfetched, and restore writes accounts without this use case.
    const accounts = await accountRepository.getAccounts(householdId, true);
    const order = accounts.reduce((max, a) => Math.max(max, a.order ?? 0), -1) + 1;

    const accountId = await accountRepository.createAccount(
      householdId,
      { ...data, order },
      userEmail,
    );

    return accountId;
  }
}

export const createAccountUseCase = new CreateAccountUseCase();
