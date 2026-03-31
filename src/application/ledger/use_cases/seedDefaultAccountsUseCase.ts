import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type AccountCreate } from '@/domains/account/types/account';
import { AccountCategory, CurrencyType } from '@/domains/account/types/categories';
import { accountRepository } from '@/infra/repositories/accountRepository';

export interface SeedDefaultAccountsRequest {
  householdId: string;
  userEmail: string;
  auth: AuthContext;
}

export class SeedDefaultAccountsUseCase {
  async execute(request: SeedDefaultAccountsRequest): Promise<void> {
    const { householdId, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const defaultAccounts: AccountCreate[] = [
      {
        name: '現金',
        category: AccountCategory.CASH,
        currency: CurrencyType.TWD,
        order: 1,
      },
      {
        name: '銀行存款',
        category: AccountCategory.BANK,
        currency: CurrencyType.TWD,
        order: 2,
      },
    ];

    for (const account of defaultAccounts) {
      // Logic could check if account already exists by name before creating
      // For now, we assume this is a fresh start
      await accountRepository.createAccount(householdId, account, userEmail);
    }
  }
}

export const seedDefaultAccountsUseCase = new SeedDefaultAccountsUseCase();
