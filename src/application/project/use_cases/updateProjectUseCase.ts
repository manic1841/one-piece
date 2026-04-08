import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type Project } from '@/domains/project/schemas';
import { projectRepository } from '@/infra/repositories/projectRepository';

export interface UpdateProjectRequest {
  householdId: string;
  projectId: string;
  updates: Partial<Project>;
  userEmail: string;
  auth: AuthContext;
}

export class UpdateProjectUseCase {
  async execute(request: UpdateProjectRequest): Promise<void> {
    const { householdId, projectId, updates, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    return projectRepository.update([householdId, projectId], updates, userEmail);
  }
}

export const updateProjectUseCase = new UpdateProjectUseCase();
