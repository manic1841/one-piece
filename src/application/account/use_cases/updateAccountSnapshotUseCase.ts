import { accountSnapshotRepository } from '@/infra/repositories/accountSnapshotRepository';
import { type AccountSnapshotCreate } from '@/domains/account/types/account';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface UpdateAccountSnapshotRequest {
  householdId: string;
  accountId: string;
  snapshotId: string;
  updates: Partial<AccountSnapshotCreate>;
  userEmail: string;
  auth: AuthContext;
}

export class UpdateAccountSnapshotUseCase {
  async execute(request: UpdateAccountSnapshotRequest): Promise<void> {
    const { householdId, accountId, snapshotId, updates, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return await accountSnapshotRepository.update(
      [householdId, accountId, snapshotId],
      updates,
      userEmail,
    );
  }
}

export const updateAccountSnapshotUseCase = new UpdateAccountSnapshotUseCase();
