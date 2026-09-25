import { type AuthContext } from '@/application/types';
import { type AccountSnapshotCreate } from '@/domains/account/types/account';

import { recordAccountSnapshotUseCase } from './recordAccountSnapshotUseCase';

export interface BatchRecordSnapshotsRequest {
  householdId: string;
  snapshots: Array<{ accountId: string; data: AccountSnapshotCreate }>;
  userEmail: string;
  auth: AuthContext;
}

export class BatchRecordSnapshotsUseCase {
  async execute(request: BatchRecordSnapshotsRequest): Promise<void> {
    const { householdId, snapshots, userEmail, auth } = request;

    const promises = snapshots.map((s) =>
      recordAccountSnapshotUseCase.execute({
        householdId,
        accountId: s.accountId,
        snapshot: s.data,
        userEmail,
        auth,
      }),
    );

    await Promise.all(promises);
  }
}

export const batchRecordSnapshotsUseCase = new BatchRecordSnapshotsUseCase();
