import { type Transaction } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type ProjectSnapshotCreate } from '@/domains/project/schemas';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';

export interface RecordProjectSnapshotRequest {
  householdId: string;
  projectId: string;
  data: ProjectSnapshotCreate;
  userEmail: string;
  auth: AuthContext;
  tx?: Transaction;
}

export class RecordProjectSnapshotUseCase {
  async execute(request: RecordProjectSnapshotRequest): Promise<string> {
    const { householdId, projectId, data, userEmail, auth, tx } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
      tx,
    );
    const snapshotId = projectSnapshotRepository.buildId(data.year, data.month);
    return projectSnapshotRepository.create(
      [householdId, projectId],
      data,
      userEmail,
      tx,
      snapshotId,
    );
  }
}

export const recordProjectSnapshotUseCase = new RecordProjectSnapshotUseCase();
