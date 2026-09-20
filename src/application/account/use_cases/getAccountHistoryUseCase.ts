import { getAccountSnapshotsUseCase } from './getAccountSnapshotsUseCase';
import { type AccountSnapshot } from '@/domains/account/types/account';
import { type AuthContext } from '@/application/types';

export interface GetAccountHistoryRequest {
  householdId: string;
  accountId: string;
  limit?: number;
  auth: AuthContext;
}

const DEFAULT_HISTORY_LENGTH = 12;

const toMonthIndex = (snapshot: AccountSnapshot): number =>
  snapshot.year * 12 + (snapshot.month - 1);

export class GetAccountHistoryUseCase {
  async execute(request: GetAccountHistoryRequest): Promise<AccountSnapshot[]> {
    const { householdId, accountId, limit, auth } = request;

    const snapshots = await getAccountSnapshotsUseCase.execute({
      householdId,
      accountId,
      auth,
    });

    const sorted = snapshots
      .slice()
      .sort((a, b) => toMonthIndex(a) - toMonthIndex(b));

    const windowLength = limit ?? DEFAULT_HISTORY_LENGTH;
    return sorted.slice(Math.max(0, sorted.length - windowLength));
  }
}

export const getAccountHistoryUseCase = new GetAccountHistoryUseCase();
