import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type Account, type AccountSnapshot } from '@/domains/account/types/account';

import { getAccountSnapshotsUseCase } from './getAccountSnapshotsUseCase';
import { getAccountUseCase } from './getAccountUseCase';
import { getAccountsUseCase } from './getAccountsUseCase';
import { getLatestSnapshotUseCase } from './getLatestSnapshotUseCase';

export interface AccountWithSnapshot extends Account {
  snapshot: AccountSnapshot | null;
}

export interface GetAccountsWithSnapshotsRequest {
  householdId: string;
  auth: AuthContext;
  accountId?: string;
  year?: number;
  month?: number;
  includeInactive?: boolean;
}

export class GetAccountsWithSnapshotsUseCase {
  async execute(request: GetAccountsWithSnapshotsRequest): Promise<AccountWithSnapshot[]> {
    const { householdId, auth, accountId, year, month, includeInactive = false } = request;

    // The per-account snapshot queries below skip their redundant checks.
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const accounts = accountId
      ? [
          await getAccountUseCase.execute({
            householdId,
            accountId,
            auth,
            skipPermissionCheck: true,
          }),
        ]
      : await getAccountsUseCase.execute({
          householdId,
          auth,
          includeInactive,
          skipPermissionCheck: true,
        });

    // The snapshot reads are independent of each other, so they run together
    // instead of queueing one round-trip per account.
    const rows = await Promise.all(
      accounts
        .filter((account): account is Account => Boolean(account))
        .map(async (account) => {
          const snapshot =
            year || month
              ? ((
                  await getAccountSnapshotsUseCase.execute({
                    householdId,
                    accountId: account.id,
                    auth,
                    year,
                    month,
                    skipPermissionCheck: true,
                    latestByCreatedAt: true,
                  })
                )[0] ?? null)
              : await getLatestSnapshotUseCase.execute({
                  householdId,
                  accountId: account.id,
                  auth,
                  skipPermissionCheck: true,
                });

          return { ...account, snapshot };
        }),
    );

    return rows;
  }
}

export const getAccountsWithSnapshotsUseCase = new GetAccountsWithSnapshotsUseCase();
