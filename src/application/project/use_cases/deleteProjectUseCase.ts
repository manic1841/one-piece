import { projectRepository } from '@/infra/repositories/projectRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface DeleteProjectRequest {
  householdId: string;
  projectId: string;
  auth: AuthContext;
}

export class DeleteProjectUseCase {
  async execute(request: DeleteProjectRequest): Promise<void> {
    const { householdId, projectId, auth } = request;
    await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return projectRepository.delete([householdId, projectId]);
  }
}

export const deleteProjectUseCase = new DeleteProjectUseCase();
