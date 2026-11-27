import { withReadPermission } from '@/application/common/readGuard';
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

    // The balance bundle does not need the project document, so both reads start
    // together; a missing project just discards the balance result.
    const [project, balance] = await withReadPermission(householdId, auth, () =>
      Promise.all([
        projectRepository.get([householdId, projectId]),
        loadProjectBalance(householdId, projectId),
      ]),
    );
    if (!project) return null;

    return balance;
  }
}

export const getProjectBalanceUseCase = new GetProjectBalanceUseCase();
