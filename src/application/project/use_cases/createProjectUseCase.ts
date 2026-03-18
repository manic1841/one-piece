import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type ProjectCreate } from '@/domains/project/schemas';
import { projectRepository } from '@/infra/repositories/projectRepository';

export interface CreateProjectRequest {
  householdId: string;
  data: ProjectCreate;
  userEmail: string;
  auth: AuthContext;
}

export class CreateProjectUseCase {
  async execute(request: CreateProjectRequest): Promise<string> {
    const { householdId, data, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    return projectRepository.create([householdId], data, userEmail);
  }
}

export const createProjectUseCase = new CreateProjectUseCase();
