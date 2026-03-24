import { getAccountSnapshotsUseCase } from './getAccountSnapshotsUseCase';
import { getAccountsUseCase } from './getAccountsUseCase';
import { getAccountUseCase } from './getAccountUseCase';
import { getLatestSnapshotUseCase } from './getLatestSnapshotUseCase';
import { type Account, type AccountSnapshot } from '@/domains/account/types/account';
import { type AuthContext } from '@/application/types';

export interface AccountWithSnapshot extends Account {
  snapshot: AccountSnapshot | null;
}

export interface GetAccountsWithSnapshotsRequest {
  householdId: string;
  auth: AuthContext;
  accountId?: string;
  year?: number;
  month?: number;
}

export class GetAccountsWithSnapshotsUseCase {
  async execute(request: GetAccountsWithSnapshotsRequest): Promise<AccountWithSnapshot[]> {
    const { householdId, auth, accountId, year, month } = request;

    const accounts = accountId
      ? [await getAccountUseCase.execute({ householdId, accountId, auth })]
      : await getAccountsUseCase.execute({ householdId, auth });

    const result: AccountWithSnapshot[] = [];
    for (const account of accounts) {
      if (!account) continue;
      
      let snapshot: AccountSnapshot | null = null;
      
      if (year || month) {
        const snapshots = await getAccountSnapshotsUseCase.execute({
          householdId,
          accountId: account.id,
          auth,
          year,
          month,
        });
        snapshot = snapshots.length > 0 ? snapshots[0] : null;
      } else {
        snapshot = await getLatestSnapshotUseCase.execute({ 
          householdId, 
          accountId: account.id, 
          auth 
        });
      }
      
      result.push({ ...account, snapshot });
    }
    return result;
  }
}

export const getAccountsWithSnapshotsUseCase = new GetAccountsWithSnapshotsUseCase();
