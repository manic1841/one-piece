import { householdPermissionService } from '@/application/household/householdPermissionService';
import {
  type ProjectBalanceResponse,
  loadProjectBalance,
} from '@/application/project/projectBalanceLoader';
import { type AuthContext } from '@/application/types';
import { projectRepository } from '@/infra/repositories/projectRepository';

export interface GetProjectBalanceRequest {
  householdId: string;
  projectId: string;
  auth: AuthContext;
}

export class GetProjectBalanceUseCase {
  async execute(request: GetProjectBalanceRequest): Promise<ProjectBalanceResponse | null> {
    const { householdId, projectId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const project = await projectRepository.get([householdId, projectId]);
    if (!project) return null;

    return loadProjectBalance(householdId, projectId);
  }
}

export const getProjectBalanceUseCase = new GetProjectBalanceUseCase();
