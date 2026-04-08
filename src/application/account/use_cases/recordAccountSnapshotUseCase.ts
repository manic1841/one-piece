import { accountSnapshotRepository } from '@/infra/repositories/accountSnapshotRepository';
import { type AccountSnapshotCreate } from '@/domains/account/types/account';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface RecordAccountSnapshotRequest {
  householdId: string;
  accountId: string;
  snapshot: AccountSnapshotCreate;
  userEmail: string;
  auth: AuthContext;
}

export class RecordAccountSnapshotUseCase {
  async execute(request: RecordAccountSnapshotRequest): Promise<string> {
    const { householdId, accountId, snapshot, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const customId = accountSnapshotRepository.buildId(snapshot.year, snapshot.month);
    return await accountSnapshotRepository.create(
      [householdId, accountId],
      snapshot,
      userEmail,
      undefined,
      customId,
    );
  }
}

export const recordAccountSnapshotUseCase = new RecordAccountSnapshotUseCase();
