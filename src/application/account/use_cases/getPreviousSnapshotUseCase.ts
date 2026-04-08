import { getAccountSnapshotsUseCase } from './getAccountSnapshotsUseCase';
import { type AccountSnapshot } from '@/domains/account/types/account';
import { type AuthContext } from '@/application/types';

export interface GetPreviousSnapshotRequest {
  householdId: string;
  accountId: string;
  year: number;
  month: number;
  auth: AuthContext;
}

export class GetPreviousSnapshotUseCase {
  async execute(request: GetPreviousSnapshotRequest): Promise<AccountSnapshot | null> {
    const { householdId, accountId, year, month, auth } = request;

    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const snapshots = await getAccountSnapshotsUseCase.execute({
      householdId,
      accountId,
      year: prevYear,
      month: prevMonth,
      auth,
    });

    return snapshots.length > 0 ? snapshots[0] : null;
  }
}

export const getPreviousSnapshotUseCase = new GetPreviousSnapshotUseCase();
