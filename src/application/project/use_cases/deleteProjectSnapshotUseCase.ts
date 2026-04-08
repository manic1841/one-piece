import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface DeleteProjectSnapshotRequest {
  householdId: string;
  projectId: string;
  snapshotId: string;
  auth: AuthContext;
}

export class DeleteProjectSnapshotUseCase {
  async execute(request: DeleteProjectSnapshotRequest): Promise<void> {
    const { householdId, projectId, snapshotId, auth } = request;
    await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return projectSnapshotRepository.delete([householdId, projectId, snapshotId]);
  }
}

export const deleteProjectSnapshotUseCase = new DeleteProjectSnapshotUseCase();
