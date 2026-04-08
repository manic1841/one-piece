import { accountSnapshotRepository } from '@/infra/repositories/accountSnapshotRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface DeleteAccountSnapshotRequest {
  householdId: string;
  accountId: string;
  snapshotId: string;
  auth: AuthContext;
}

export class DeleteAccountSnapshotUseCase {
  async execute(request: DeleteAccountSnapshotRequest): Promise<void> {
    const { householdId, accountId, snapshotId, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return await accountSnapshotRepository.delete([householdId, accountId, snapshotId]);
  }
}

export const deleteAccountSnapshotUseCase = new DeleteAccountSnapshotUseCase();
