import { type Transaction } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type ProjectSnapshot } from '@/domains/project/schemas';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';

export interface UpdateProjectSnapshotRequest {
  householdId: string;
  projectId: string;
  snapshotId: string;
  updates: Partial<ProjectSnapshot>;
  userEmail: string;
  auth: AuthContext;
  tx?: Transaction;
}

export class UpdateProjectSnapshotUseCase {
  async execute(request: UpdateProjectSnapshotRequest): Promise<void> {
    const { householdId, projectId, snapshotId, updates, userEmail, auth, tx } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
      tx,
    );
    return projectSnapshotRepository.update(
      [householdId, projectId, snapshotId],
      updates,
      userEmail,
      tx,
    );
  }
}

export const updateProjectSnapshotUseCase = new UpdateProjectSnapshotUseCase();
