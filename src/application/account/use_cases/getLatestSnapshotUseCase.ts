import { getAccountSnapshotsUseCase } from './getAccountSnapshotsUseCase';
import { type AccountSnapshot } from '@/domains/account/types/account';
import { type AuthContext } from '@/application/types';

export interface GetLatestSnapshotRequest {
  householdId: string;
  accountId: string;
  auth: AuthContext;
}

export class GetLatestSnapshotUseCase {
  async execute(request: GetLatestSnapshotRequest): Promise<AccountSnapshot | null> {
    const { householdId, accountId, auth } = request;

    const snapshots = await getAccountSnapshotsUseCase.execute({
      householdId,
      accountId,
      auth,
    });

    if (snapshots.length === 0) return null;

    return snapshots.reduce((latest, current) => {
      if (current.year > latest.year) return current;
      if (current.year === latest.year && current.month > latest.month) return current;
      return latest;
    }, snapshots[0]);
  }
}

export const getLatestSnapshotUseCase = new GetLatestSnapshotUseCase();
