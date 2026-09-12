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
}

export class RecordProjectSnapshotUseCase {
  async execute(request: RecordProjectSnapshotRequest): Promise<string> {
    const { householdId, projectId, data, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    const snapshotId = projectSnapshotRepository.buildId(data.year, data.month);
    return projectSnapshotRepository.create(
      [householdId, projectId],
      data,
      userEmail,
      undefined,
      snapshotId,
    );
  }
}

export const recordProjectSnapshotUseCase = new RecordProjectSnapshotUseCase();
