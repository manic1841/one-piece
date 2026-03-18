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
}

export class GetAccountsWithSnapshotsUseCase {
  async execute(request: GetAccountsWithSnapshotsRequest): Promise<AccountWithSnapshot[]> {
    const { householdId, auth, accountId } = request;

    const accounts = accountId
      ? [await getAccountUseCase.execute({ householdId, accountId, auth })]
      : await getAccountsUseCase.execute({ householdId, auth });

    const result: AccountWithSnapshot[] = [];
    for (const account of accounts) {
      if (!account) continue;
      const snapshot = await getLatestSnapshotUseCase.execute({ 
        householdId, 
        accountId: account.id, 
        auth 
      });
      result.push({ ...account, snapshot });
    }
    return result;
  }
}

export const getAccountsWithSnapshotsUseCase = new GetAccountsWithSnapshotsUseCase();
