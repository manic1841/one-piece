import { withReadPermission } from '@/application/common/readGuard';
import { type AuthContext } from '@/application/types';
import { type Account, type AccountSnapshot } from '@/domains/account/types/account';
import { mapInBatches } from '@/shared/batch';

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
    const accounts = await withReadPermission(
      householdId,
      auth,
      async (): Promise<(Account | null)[]> =>
        accountId
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
            }),
    );

    // The snapshot reads are independent of each other, so they run together
    // instead of queueing one round-trip per account — in batches, so a large
    // household does not fire every round trip at once.
    const rows = await mapInBatches(
      accounts.filter((account): account is Account => Boolean(account)),
      async (account) => {
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
      },
    );

    return rows;
  }
}

export const getAccountsWithSnapshotsUseCase = new GetAccountsWithSnapshotsUseCase();
